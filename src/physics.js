// Deterministic physics core: World/Body model + fixed-timestep semi-implicit
// Euler step(). Pure functions only — step() never mutates its input world,
// its bodies, or their vectors. See contracts/world-model.md (frozen v1) and
// ADR-0002 (fixed-timestep semi-implicit Euler).
//
// Coordinates are world units = canvas CSS pixels, origin top-left, +y points
// DOWN (canvas-native). Time is in seconds.

import { add, scale } from './vec2.js';
import { planetForce } from './launchers.js';

/** The ONE timestep the game loop and tests use, in seconds. */
export const FIXED_DT = 1 / 120;

/** Play-field size in world units. */
export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;

/**
 * @param {{x?: number, y?: number}} [partial]
 * @returns {{x: number, y: number}}
 */
function vec2Default(partial, fallback) {
  const v = partial ?? fallback;
  return { x: v.x ?? fallback.x, y: v.y ?? fallback.y };
}

/**
 * Fills defaults and copies arrays so the caller's arrays are never aliased.
 * @param {Partial<World>} [partial]
 * @returns {World}
 */
export function createWorld(partial = {}) {
  return {
    gravity: vec2Default(partial.gravity, { x: 0, y: 500 }),
    bodies: partial.bodies ? partial.bodies.slice() : [],
    planets: partial.planets ? partial.planets.slice() : [],
    targets: partial.targets ? partial.targets.slice() : [],
    walls: partial.walls ? partial.walls.slice() : [],
    bounds: partial.bounds
      ? { ...partial.bounds }
      : { x: 0, y: 0, w: WORLD_WIDTH, h: WORLD_HEIGHT },
  };
}

/**
 * @param {Partial<Body>} [partial]
 * @returns {Body}
 */
export function createBody(partial = {}) {
  return {
    pos: vec2Default(partial.pos, { x: 0, y: 0 }),
    vel: vec2Default(partial.vel, { x: 0, y: 0 }),
    mass: partial.mass ?? 1,
    radius: partial.radius ?? 12,
    kind: partial.kind ?? 'ball',
  };
}

/**
 * Advances the world by one fixed timestep using semi-implicit Euler.
 * Pure: returns a NEW world; never mutates `world` or its bodies'/vectors.
 * No collision handling here (that's collision.resolveCollisions, stage 5).
 *
 * @param {World} world
 * @param {number} dt
 * @returns {World}
 */
export function step(world, dt) {
  const bodies = world.bodies.map((body) => {
    // force = gravity * mass, plus the summed radial pull of every planet
    // (contracts/world-model.md §"Planet force"; stage 4).
    let force = scale(world.gravity, body.mass);
    for (const planet of world.planets) {
      force = add(force, planetForce(planet, body));
    }

    const vel = add(body.vel, scale(force, dt / body.mass));
    const pos = add(body.pos, scale(vel, dt));

    return { ...body, pos, vel };
  });

  return {
    gravity: { ...world.gravity },
    bodies,
    planets: world.planets.slice(),
    targets: world.targets.slice(),
    walls: world.walls.slice(),
    bounds: { ...world.bounds },
  };
}
