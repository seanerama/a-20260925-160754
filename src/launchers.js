// Pure launcher math: settings -> initial velocity. No DOM, no mutation.
// See contracts/level-schema.md (§Launcher math — frozen v1).
//
// Only imports src/vec2.js. Must NOT import src/physics.js (no cycle).
// Stage 4 adds `planetForce` + `PLANET_G` to this same file (see below).

import { fromAngle, sub, normalize, scale } from './vec2.js';

/**
 * Cannon launch velocity. `power` is an impulse: speed = power / mass.
 * Direction via fromAngle (screen convention: 0° = +x right, 90° = up).
 * @param {{angle: number, power: number}} settings
 * @param {number} [mass=1]
 * @returns {{x: number, y: number}}
 */
export function cannonVelocity({ angle, power }, mass = 1) {
  const speed = power / mass;
  return fromAngle(angle, speed);
}

/**
 * Ramp launch velocity. Frictionless energy conservation: speed = sqrt(2·g·height).
 * Leaves along the slope, descending (+y is down, so y is positive here).
 * @param {{incline: number, height: number, direction: 1 | -1}} settings
 * @param {number} g gravity magnitude (> 0)
 * @returns {{x: number, y: number}}
 */
export function rampVelocity({ incline, height, direction }, g) {
  const speed = Math.sqrt(2 * g * height);
  const theta = (incline * Math.PI) / 180;
  return { x: direction * Math.cos(theta) * speed, y: Math.sin(theta) * speed };
}

/**
 * Gravitational constant for the planet launcher, tuned for gameplay (this is
 * NOT the real-world SI value — it's picked so a level-sized planet feels
 * right on a 960x540 field).
 *
 * Tuning target (contracts/world-model.md + stage-4 instructions): a planet
 * `{ radius: 40, mass: 1000 }` must visibly bend a power-400 cannon shot that
 * passes ~150 units from its centre. At r = 150, |F|/mass = PLANET_G *
 * planet.mass / r^2 = PLANET_G * 1000 / 22500 ≈ PLANET_G * 0.0444. With
 * PLANET_G = 6e4 that's an acceleration of ~2667 units/s^2 at closest
 * approach — comparable to (a few times) the default downward gravity
 * (500 units/s^2) — which curves a 400 units/s shot by tens of degrees as it
 * passes, a clearly visible slingshot, while staying weak enough (thanks to
 * the 1/r^2 falloff and the radius^2 softening floor) that it doesn't yank in
 * shots fired from far across the field.
 */
export const PLANET_G = 6e4;

/**
 * Newtonian-style radial attraction toward a planet's centre.
 * See contracts/world-model.md §"Planet force" (frozen v1):
 *   d   = planet.pos − body.pos
 *   r²  = max(|d|², planet.radius²)     // softening: no singularity at d = 0
 *   |F| = PLANET_G · planet.mass · body.mass / r²
 *   F   = normalize(d) · |F|            // points FROM body TOWARD planet centre
 *
 * Pure: never mutates `planet` or `body`.
 * @param {{pos: {x: number, y: number}, radius: number, mass: number}} planet
 * @param {{pos: {x: number, y: number}, mass: number}} body
 * @returns {{x: number, y: number}}
 */
export function planetForce(planet, body) {
  const d = sub(planet.pos, body.pos);
  const r2 = Math.max(d.x * d.x + d.y * d.y, planet.radius * planet.radius);
  const magnitude = (PLANET_G * planet.mass * body.mass) / r2;
  return scale(normalize(d), magnitude);
}
