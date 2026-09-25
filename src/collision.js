// Pure collision predicates/responses + attempt-status logic.
// No DOM, no UI — this module is a leaf that only touches World/Body/Target/
// Rect plain objects. See contracts/scoring.md (§"Collision + attempt
// status", frozen v1) for the exact contract this file implements.
//
// Coordinates are world units = canvas CSS pixels, origin top-left, +y points
// DOWN (canvas-native). Pure functions only — never mutate inputs.

import { distance, length } from './vec2.js';

/** Default bounce coefficient. */
export const RESTITUTION = 0.6;

/** Tangential-velocity multiplier applied on every contact. */
export const FRICTION = 0.98;

/** World units/s; below this a supported body is "at rest". */
export const REST_SPEED = 5;

/** Safety timeout for one attempt, in seconds. */
export const MAX_ATTEMPT_SECONDS = 15;

/**
 * Reflects the normal component of `vel` about `normal` (unit vector,
 * pointing AWAY from the surface, toward the body), applying `restitution`
 * to the normal component and `FRICTION` to the tangential component. Kills
 * micro-bounce: if the reflected normal speed is < REST_SPEED it is zeroed.
 *
 * @param {{x: number, y: number}} vel
 * @param {{x: number, y: number}} normal unit vector
 * @param {number} restitution
 * @returns {{x: number, y: number}}
 */
function reflectVelocity(vel, normal, restitution) {
  const vn = vel.x * normal.x + vel.y * normal.y; // component along normal
  const vnVec = { x: normal.x * vn, y: normal.y * vn };
  const vtVec = { x: vel.x - vnVec.x, y: vel.y - vnVec.y };

  let reflectedVn = -vn * restitution;
  if (Math.abs(reflectedVn) < REST_SPEED) {
    reflectedVn = 0;
  }

  return {
    x: normal.x * reflectedVn + vtVec.x * FRICTION,
    y: normal.y * reflectedVn + vtVec.y * FRICTION,
  };
}

/**
 * Keeps `body` inside the left, right and bottom edges of `bounds` (bottom =
 * the ground). The top edge is open: a body may fly above and fall back, it
 * is never bounced there.
 *
 * Pure: returns a NEW body; never mutates `body` or `bounds`.
 *
 * @param {{pos: {x:number,y:number}, vel: {x:number,y:number}, radius: number}} body
 * @param {{x:number,y:number,w:number,h:number}} bounds
 * @param {number} [restitution=RESTITUTION]
 * @returns {Body}
 */
export function bounceOffBounds(body, bounds, restitution = RESTITUTION) {
  let pos = { ...body.pos };
  let vel = { ...body.vel };

  const left = bounds.x;
  const right = bounds.x + bounds.w;
  const bottom = bounds.y + bounds.h;

  // Left wall — normal points right (+1, 0), into the field.
  if (pos.x - body.radius < left) {
    pos.x = left + body.radius;
    const reflected = reflectVelocity(vel, { x: 1, y: 0 }, restitution);
    vel = reflected;
  }

  // Right wall — normal points left (-1, 0), into the field.
  if (pos.x + body.radius > right) {
    pos.x = right - body.radius;
    const reflected = reflectVelocity(vel, { x: -1, y: 0 }, restitution);
    vel = reflected;
  }

  // Ground (bottom) — normal points up (0, -1), into the field. Top is open:
  // no check against bounds.y here.
  if (pos.y + body.radius > bottom) {
    pos.y = bottom - body.radius;
    const reflected = reflectVelocity(vel, { x: 0, y: -1 }, restitution);
    vel = reflected;
  }

  return { ...body, pos, vel };
}

/**
 * Circle-vs-AABB collision: keeps `body` outside a solid `rect`. Uses the
 * closest point on the rect to the body centre as the contact point/normal.
 * Handles the centre-inside-rect case (closest-point normal would be
 * zero-length) by pushing out along the shallowest axis instead.
 *
 * Pure: returns a NEW body; never mutates `body` or `rect`.
 *
 * @param {Body} body
 * @param {{x:number,y:number,w:number,h:number}} rect
 * @param {number} [restitution=RESTITUTION]
 * @returns {Body}
 */
export function bounceOffRect(body, rect, restitution = RESTITUTION) {
  const cx = body.pos.x;
  const cy = body.pos.y;
  const rx0 = rect.x;
  const ry0 = rect.y;
  const rx1 = rect.x + rect.w;
  const ry1 = rect.y + rect.h;

  const insideX = cx > rx0 && cx < rx1;
  const insideY = cy > ry0 && cy < ry1;

  let normal;
  let depth;

  if (insideX && insideY) {
    // Centre-inside case: the closest-point normal would be zero-length.
    // Push out along the shallowest axis instead.
    const distLeft = cx - rx0;
    const distRight = rx1 - cx;
    const distTop = cy - ry0;
    const distBottom = ry1 - cy;
    const minDist = Math.min(distLeft, distRight, distTop, distBottom);

    if (minDist === distLeft) {
      normal = { x: -1, y: 0 };
    } else if (minDist === distRight) {
      normal = { x: 1, y: 0 };
    } else if (minDist === distTop) {
      normal = { x: 0, y: -1 };
    } else {
      normal = { x: 0, y: 1 };
    }
    depth = minDist + body.radius;
  } else {
    const closestX = Math.max(rx0, Math.min(cx, rx1));
    const closestY = Math.max(ry0, Math.min(cy, ry1));
    const dx = cx - closestX;
    const dy = cy - closestY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist === 0) {
      // Body centre lies exactly on the rect's boundary — degenerate case,
      // pick an arbitrary (finite, non-NaN) outward normal.
      normal = { x: 0, y: -1 };
      depth = body.radius;
    } else {
      normal = { x: dx / dist, y: dy / dist };
      depth = body.radius - dist;
      if (depth <= 0) {
        // No overlap: not touching the rect.
        return { ...body, pos: { ...body.pos }, vel: { ...body.vel } };
      }
    }
  }

  const pos = { x: body.pos.x + normal.x * depth, y: body.pos.y + normal.y * depth };
  const vel = reflectVelocity(body.vel, normal, restitution);

  return { ...body, pos, vel };
}

/**
 * @param {Body} body
 * @param {Target} target
 * @returns {boolean}
 */
export function isTargetHit(body, target) {
  return distance(body.pos, target.pos) <= body.radius + target.radius;
}

/**
 * @param {Body} body
 * @param {number} [epsilon=REST_SPEED]
 * @returns {boolean}
 */
export function isAtRest(body, epsilon = REST_SPEED) {
  return length(body.vel) < epsilon;
}

/**
 * Body's bottom is within 1 unit of the ground (bounds bottom edge) or of
 * the top face of a wall it horizontally overlaps.
 *
 * @param {Body} body
 * @param {World} world
 * @returns {boolean}
 */
export function isSupported(body, world) {
  const bodyBottom = body.pos.y + body.radius;
  const groundY = world.bounds.y + world.bounds.h;

  if (Math.abs(bodyBottom - groundY) <= 1) {
    return true;
  }

  for (const wall of world.walls) {
    const overlapsX = body.pos.x + body.radius > wall.x && body.pos.x - body.radius < wall.x + wall.w;
    if (overlapsX && Math.abs(bodyBottom - wall.y) <= 1) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves all collisions for one step: every body bounces off every wall,
 * then off the play-field bounds; then every target any body overlaps is
 * marked `hit: true`. Hits are sticky — a target already `hit: true` stays
 * `hit: true` even if bodies no longer overlap it later.
 *
 * Pure: returns a NEW world; never mutates `world`, its bodies, or targets.
 *
 * @param {World} world
 * @param {number} [restitution=RESTITUTION]
 * @returns {World}
 */
export function resolveCollisions(world, restitution = RESTITUTION) {
  const bodies = world.bodies.map((body) => {
    let b = body;
    for (const wall of world.walls) {
      b = bounceOffRect(b, wall, restitution);
    }
    b = bounceOffBounds(b, world.bounds, restitution);
    return b;
  });

  const targets = world.targets.map((target) => {
    if (target.hit) {
      return target;
    }
    const hit = bodies.some((b) => isTargetHit(b, target));
    return hit ? { ...target, hit: true } : { ...target };
  });

  return {
    gravity: { ...world.gravity },
    bodies,
    planets: world.planets.slice(),
    targets,
    walls: world.walls.slice(),
    bounds: { ...world.bounds },
  };
}

/**
 * @param {World} world
 * @param {number} elapsedSeconds
 * @returns {'running' | 'all-hit' | 'rest' | 'timeout'}
 */
export function attemptStatus(world, elapsedSeconds) {
  if (world.targets.length > 0 && world.targets.every((t) => t.hit === true)) {
    return 'all-hit';
  }

  if (world.bodies.length > 0 && world.bodies.every((b) => isAtRest(b) && isSupported(b, world))) {
    return 'rest';
  }

  if (elapsedSeconds >= MAX_ATTEMPT_SECONDS) {
    return 'timeout';
  }

  return 'running';
}
