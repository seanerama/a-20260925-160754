// Pure launcher math: settings -> initial velocity. No DOM, no mutation.
// See contracts/level-schema.md (§Launcher math — frozen v1).
//
// Only imports src/vec2.js. Must NOT import src/physics.js (no cycle).
// Stage 4 adds `planetForce` + `PLANET_G` to this same file — not built yet.

import { fromAngle } from './vec2.js';

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
