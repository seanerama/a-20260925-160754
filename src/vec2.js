// Plain-object 2-D vectors. Pure functions only — never mutate inputs.
//
// Coordinates are world units = canvas CSS pixels, origin top-left, +y points
// DOWN (canvas-native). See contracts/world-model.md (frozen v1).

/**
 * @param {number} [x=0]
 * @param {number} [y=0]
 * @returns {{x: number, y: number}}
 */
export function vec2(x = 0, y = 0) {
  return { x, y };
}

/**
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @returns {{x: number, y: number}}
 */
export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * a - b
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @returns {{x: number, y: number}}
 */
export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * @param {{x: number, y: number}} v
 * @param {number} s
 * @returns {{x: number, y: number}}
 */
export function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

/**
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @returns {number}
 */
export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

/**
 * @param {{x: number, y: number}} v
 * @returns {number}
 */
export function length(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * @param {{x: number, y: number}} a
 * @param {{x: number, y: number}} b
 * @returns {number}
 */
export function distance(a, b) {
  return length(sub(a, b));
}

/**
 * Zero vector normalizes to {x: 0, y: 0} — never NaN.
 * @param {{x: number, y: number}} v
 * @returns {{x: number, y: number}}
 */
export function normalize(v) {
  const len = length(v);
  if (len === 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / len, y: v.y / len };
}

/**
 * Screen convention: 0° = +x (right), 90° = straight up.
 * @param {number} degrees
 * @param {number} [magnitude=1]
 * @returns {{x: number, y: number}}
 */
export function fromAngle(degrees, magnitude = 1) {
  const theta = (degrees * Math.PI) / 180;
  return { x: magnitude * Math.cos(theta), y: -magnitude * Math.sin(theta) };
}
