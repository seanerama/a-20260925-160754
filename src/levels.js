// Declarative level schema + loader/validator (ADR-0003: levels are data).
// See contracts/level-schema.md (§Levels — frozen v1) for the exact shape
// this file must implement.
//
// Only imports src/physics.js, src/launchers.js and src/vec2.js. Pure —
// no DOM, no mutation of inputs, no aliasing of LEVELS data.

import { createWorld, createBody } from './physics.js';
import { cannonVelocity, rampVelocity } from './launchers.js';
import { length } from './vec2.js';

function isFiniteNumber(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

function isFiniteVec(v) {
  return v != null && typeof v === 'object' && isFiniteNumber(v.x) && isFiniteNumber(v.y);
}

function isNonEmptyString(s) {
  return typeof s === 'string' && s.trim().length > 0;
}

/**
 * Validates a Level object against contracts/level-schema.md.
 * Never throws — always returns the full list of human-readable errors
 * (empty array ⇔ valid).
 *
 * @param {object} level
 * @returns {string[]}
 */
export function validateLevel(level) {
  const errors = [];

  if (level == null || typeof level !== 'object') {
    return ['level must be an object'];
  }

  if (!isNonEmptyString(level.id)) {
    errors.push('id must be a non-empty string');
  }

  if (!isNonEmptyString(level.name)) {
    errors.push('name must be a non-empty string');
  }

  if (!isFiniteVec(level.gravity)) {
    errors.push('gravity must be a finite { x, y } vector');
  }

  if (!Array.isArray(level.launchers)) {
    errors.push('launchers must be an array');
  } else {
    let hasCannonOrRamp = false;

    level.launchers.forEach((launcher, i) => {
      if (launcher == null || typeof launcher !== 'object') {
        errors.push(`launchers[${i}] must be an object`);
        return;
      }

      switch (launcher.type) {
        case 'cannon': {
          hasCannonOrRamp = true;
          if (!isFiniteVec(launcher.pos)) {
            errors.push(`launchers[${i}] (cannon): pos must be a finite { x, y } vector`);
          }
          if (!isFiniteNumber(launcher.angle) || launcher.angle < 0 || launcher.angle > 90) {
            errors.push(`launchers[${i}] (cannon): angle must be a number in [0, 90]`);
          }
          if (!isFiniteNumber(launcher.power) || launcher.power <= 0) {
            errors.push(`launchers[${i}] (cannon): power must be a number > 0`);
          }
          break;
        }
        case 'ramp': {
          hasCannonOrRamp = true;
          if (!isFiniteVec(launcher.pos)) {
            errors.push(`launchers[${i}] (ramp): pos must be a finite { x, y } vector`);
          }
          if (!isFiniteNumber(launcher.incline) || launcher.incline <= 0 || launcher.incline >= 90) {
            errors.push(`launchers[${i}] (ramp): incline must be a number in (0, 90)`);
          }
          if (!isFiniteNumber(launcher.height) || launcher.height <= 0) {
            errors.push(`launchers[${i}] (ramp): height must be a number > 0`);
          }
          if (launcher.direction !== 1 && launcher.direction !== -1) {
            errors.push(`launchers[${i}] (ramp): direction must be 1 or -1`);
          }
          break;
        }
        case 'planet': {
          if (!isFiniteVec(launcher.pos)) {
            errors.push(`launchers[${i}] (planet): pos must be a finite { x, y } vector`);
          }
          if (!isFiniteNumber(launcher.radius) || launcher.radius <= 0) {
            errors.push(`launchers[${i}] (planet): radius must be a number > 0`);
          }
          if (!isFiniteNumber(launcher.mass) || launcher.mass <= 0) {
            errors.push(`launchers[${i}] (planet): mass must be a number > 0`);
          }
          break;
        }
        default:
          errors.push(`launchers[${i}]: unknown launcher type '${launcher?.type}'`);
      }
    });

    if (Array.isArray(level.launchers) && !hasCannonOrRamp) {
      errors.push('launchers must include at least one cannon or ramp launcher');
    }
  }

  if (!Array.isArray(level.targets) || level.targets.length === 0) {
    errors.push('targets must be a non-empty array');
  } else {
    level.targets.forEach((target, i) => {
      if (target == null || typeof target !== 'object') {
        errors.push(`targets[${i}] must be an object`);
        return;
      }
      if (!isFiniteVec(target.pos)) {
        errors.push(`targets[${i}]: pos must be a finite { x, y } vector`);
      }
      if (!isFiniteNumber(target.radius) || target.radius <= 0) {
        errors.push(`targets[${i}]: radius must be a number > 0`);
      }
    });
  }

  if (level.obstacles !== undefined && !Array.isArray(level.obstacles)) {
    errors.push('obstacles must be an array');
  } else if (Array.isArray(level.obstacles)) {
    level.obstacles.forEach((obstacle, i) => {
      const rect = obstacle?.rect;
      if (
        rect == null ||
        typeof rect !== 'object' ||
        !isFiniteNumber(rect.x) ||
        !isFiniteNumber(rect.y) ||
        !isFiniteNumber(rect.w) ||
        !isFiniteNumber(rect.h) ||
        rect.w <= 0 ||
        rect.h <= 0
      ) {
        errors.push(`obstacles[${i}]: rect must be a finite { x, y, w, h } with w > 0 and h > 0`);
      }
    });
  }

  if (level.starThresholds == null || typeof level.starThresholds !== 'object') {
    errors.push('starThresholds is required');
  } else {
    const { three, two } = level.starThresholds;
    if (!Number.isInteger(three) || !Number.isInteger(two)) {
      errors.push('starThresholds.three and starThresholds.two must be integers');
    } else if (three < 1) {
      errors.push('starThresholds.three must be >= 1');
    } else if (three > two) {
      errors.push('starThresholds.three must be <= starThresholds.two');
    }
  }

  return errors;
}

/** `LevelError.errors: string[]`, `name === 'LevelError'`. */
export class LevelError extends Error {
  constructor(errors) {
    super(errors.join('; '));
    this.name = 'LevelError';
    this.errors = errors;
  }
}

/**
 * Validates and builds a World from a Level. Throws LevelError (joined
 * message, `.errors`) if invalid. All returned objects are fresh copies —
 * mutating the result never touches the source Level / LEVELS.
 *
 * @param {object} level
 * @returns {import('./physics.js').World}
 */
export function loadLevel(level) {
  const errors = validateLevel(level);
  if (errors.length > 0) {
    throw new LevelError(errors);
  }

  const planets = level.launchers
    .filter((launcher) => launcher.type === 'planet')
    .map((launcher) => ({
      pos: { ...launcher.pos },
      radius: launcher.radius,
      mass: launcher.mass,
    }));

  const targets = level.targets.map((target) => ({
    pos: { ...target.pos },
    radius: target.radius,
    hit: false,
  }));

  const walls = (level.obstacles ?? []).map((obstacle) => ({ ...obstacle.rect }));

  return createWorld({
    gravity: { ...level.gravity },
    bodies: [],
    planets,
    targets,
    walls,
    bounds: { x: 0, y: 0, w: 960, h: 540 },
  });
}

/**
 * Builds the launched Body for a cannon/ramp launcher. Throws for any other
 * launcher type (e.g. 'planet' — not player-launchable).
 *
 * @param {object} launcher
 * @param {{mass: number, gravity: {x: number, y: number}}} options
 * @returns {import('./physics.js').Body}
 */
export function spawnBody(launcher, { mass, gravity }) {
  let vel;

  if (launcher.type === 'cannon') {
    vel = cannonVelocity({ angle: launcher.angle, power: launcher.power }, mass);
  } else if (launcher.type === 'ramp') {
    vel = rampVelocity(
      { incline: launcher.incline, height: launcher.height, direction: launcher.direction },
      length(gravity),
    );
  } else {
    throw new Error(`spawnBody: cannot spawn a body from launcher type '${launcher.type}'`);
  }

  return createBody({ pos: { ...launcher.pos }, vel, mass, radius: 12, kind: 'ball' });
}

/**
 * Three declarative levels, increasing difficulty, each exercising a
 * different launcher and each proven solvable by test/levels.test.js.
 * @type {object[]}
 */
export const LEVELS = [
  {
    id: 'first-flight',
    name: 'First Flight',
    gravity: { x: 0, y: 500 },
    launchers: [{ type: 'cannon', pos: { x: 80, y: 480 }, angle: 45, power: 500 }],
    targets: [{ pos: { x: 595, y: 528 }, radius: 30 }],
    obstacles: [],
    starThresholds: { three: 1, two: 3 },
  },
  {
    id: 'ramp-run',
    name: 'Ramp Run',
    gravity: { x: 0, y: 500 },
    launchers: [
      { type: 'ramp', pos: { x: 100, y: 350 }, incline: 20, height: 150, direction: 1 },
      { type: 'cannon', pos: { x: 100, y: 350 }, angle: 20, power: 390 },
    ],
    targets: [{ pos: { x: 650, y: 510 }, radius: 30 }],
    obstacles: [{ rect: { x: 260, y: 500, w: 40, h: 40 } }],
    starThresholds: { three: 1, two: 3 },
  },
  {
    id: 'planet-slingshot',
    name: 'Planet Slingshot',
    gravity: { x: 0, y: 500 },
    launchers: [
      { type: 'cannon', pos: { x: 60, y: 480 }, angle: 55, power: 400 },
      { type: 'planet', pos: { x: 500, y: 10 }, radius: 40, mass: 6000 },
    ],
    targets: [{ pos: { x: 750, y: 300 }, radius: 30 }],
    // Full-height wall: the only way past it is up and over — the planet's
    // pull is what lets a shot climb high enough to clear it.
    obstacles: [{ rect: { x: 480, y: 0, w: 50, h: 540 } }],
    starThresholds: { three: 2, two: 5 },
  },
];
