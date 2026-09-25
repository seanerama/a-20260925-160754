import test from 'node:test';
import assert from 'node:assert/strict';
import {
  vec2,
  add,
  sub,
  scale,
  dot,
  length,
  distance,
  normalize,
  fromAngle,
} from '../src/vec2.js';

const EPS = 1e-9;

function assertClose(actual, expected, eps = EPS) {
  assert.ok(
    Math.abs(actual.x - expected.x) < eps && Math.abs(actual.y - expected.y) < eps,
    `expected {x: ${expected.x}, y: ${expected.y}}, got {x: ${actual.x}, y: ${actual.y}}`,
  );
}

test('vec2 constructs a plain object, defaulting to origin', () => {
  assert.deepEqual(vec2(), { x: 0, y: 0 });
  assert.deepEqual(vec2(3, 4), { x: 3, y: 4 });
});

test('add sums component-wise', () => {
  assert.deepEqual(add(vec2(1, 2), vec2(3, 4)), { x: 4, y: 6 });
});

test('sub computes a - b', () => {
  assert.deepEqual(sub(vec2(5, 7), vec2(2, 3)), { x: 3, y: 4 });
});

test('scale multiplies both components by a scalar', () => {
  assert.deepEqual(scale(vec2(2, 3), 5), { x: 10, y: 15 });
});

test('dot computes the dot product', () => {
  assert.equal(dot(vec2(1, 2), vec2(3, 4)), 11);
});

test('length computes the magnitude', () => {
  assert.equal(length(vec2(3, 4)), 5);
});

test('distance computes the distance between two points', () => {
  assert.equal(distance(vec2(0, 0), vec2(3, 4)), 5);
});

test('normalize returns a unit vector', () => {
  const n = normalize(vec2(3, 4));
  assertClose(n, { x: 0.6, y: 0.8 });
});

test('normalize of the zero vector returns {x: 0, y: 0}, never NaN', () => {
  const n = normalize(vec2(0, 0));
  assert.deepEqual(n, { x: 0, y: 0 });
  assert.ok(!Number.isNaN(n.x));
  assert.ok(!Number.isNaN(n.y));
});

test('fromAngle(0, 2) points along +x', () => {
  assertClose(fromAngle(0, 2), { x: 2, y: 0 });
});

test('fromAngle(90, 1) points straight up (-y)', () => {
  assertClose(fromAngle(90, 1), { x: 0, y: -1 }, 1e-9);
});

test('fromAngle defaults magnitude to 1', () => {
  assertClose(fromAngle(0), { x: 1, y: 0 });
});

test('none of the helpers mutate their input vectors', () => {
  const a = vec2(1, 2);
  const b = vec2(3, 4);
  const aCopy = { ...a };
  const bCopy = { ...b };

  add(a, b);
  sub(a, b);
  scale(a, 10);
  dot(a, b);
  length(a);
  distance(a, b);
  normalize(a);
  normalize(vec2(0, 0));
  fromAngle(45, 2);

  assert.deepEqual(a, aCopy);
  assert.deepEqual(b, bCopy);
});
