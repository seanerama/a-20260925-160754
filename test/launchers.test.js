import test from 'node:test';
import assert from 'node:assert/strict';
import { length } from '../src/vec2.js';
import { cannonVelocity, rampVelocity } from '../src/launchers.js';

const EPS = 1e-9;

function assertClose(actual, expected, eps = EPS) {
  assert.ok(
    Math.abs(actual.x - expected.x) < eps && Math.abs(actual.y - expected.y) < eps,
    `expected {x: ${expected.x}, y: ${expected.y}}, got {x: ${actual.x}, y: ${actual.y}}`,
  );
}

// --- cannonVelocity ---------------------------------------------------

test('cannonVelocity: angle 0 points purely +x (y ~ 0)', () => {
  const v = cannonVelocity({ angle: 0, power: 100 }, 1);
  assertClose(v, { x: 100, y: 0 });
});

test('cannonVelocity: angle 90 points purely -y (straight up, x ~ 0)', () => {
  const v = cannonVelocity({ angle: 90, power: 100 }, 1);
  assertClose(v, { x: 0, y: -100 });
});

test('cannonVelocity: angle 45, power 100, mass 1 -> {~70.71, ~-70.71}', () => {
  const v = cannonVelocity({ angle: 45, power: 100 }, 1);
  assertClose(v, { x: 70.71067811865476, y: -70.71067811865476 }, 1e-6);
});

test('cannonVelocity: doubling mass halves speed', () => {
  const v1 = cannonVelocity({ angle: 30, power: 100 }, 1);
  const v2 = cannonVelocity({ angle: 30, power: 100 }, 2);
  assert.ok(Math.abs(length(v2) - length(v1) / 2) < EPS);
});

test('cannonVelocity: speed always equals power / mass', () => {
  const cases = [
    { angle: 0, power: 50, mass: 1 },
    { angle: 15, power: 200, mass: 4 },
    { angle: 45, power: 100, mass: 1 },
    { angle: 60, power: 75, mass: 3 },
    { angle: 90, power: 10, mass: 0.5 },
  ];
  for (const { angle, power, mass } of cases) {
    const v = cannonVelocity({ angle, power }, mass);
    assert.ok(
      Math.abs(length(v) - power / mass) < 1e-9,
      `angle=${angle} power=${power} mass=${mass}: expected speed ${power / mass}, got ${length(v)}`,
    );
  }
});

test('cannonVelocity: mass defaults to 1', () => {
  const withDefault = cannonVelocity({ angle: 20, power: 60 });
  const explicit = cannonVelocity({ angle: 20, power: 60 }, 1);
  assertClose(withDefault, explicit);
});

test('cannonVelocity does not mutate the input settings object', () => {
  const settings = Object.freeze({ angle: 45, power: 100 });
  assert.doesNotThrow(() => cannonVelocity(settings, 2));
});

// --- rampVelocity -------------------------------------------------------

test('rampVelocity: incline 30, height 80, g 500, direction 1 -> speed sqrt(2*500*80)', () => {
  const v = rampVelocity({ incline: 30, height: 80, direction: 1 }, 500);
  const expectedSpeed = Math.sqrt(2 * 500 * 80);
  assert.ok(Math.abs(expectedSpeed - 282.84271247461903) < 1e-6);
  assert.ok(Math.abs(length(v) - expectedSpeed) < 1e-9);
  assert.ok(v.x > 0);
  assert.ok(v.y > 0);
});

test('rampVelocity: vector angle from horizontal equals incline', () => {
  const v = rampVelocity({ incline: 30, height: 80, direction: 1 }, 500);
  const angleDeg = (Math.atan2(v.y, v.x) * 180) / Math.PI;
  assert.ok(Math.abs(angleDeg - 30) < 1e-6);
});

test('rampVelocity: direction -1 mirrors x, leaves y unchanged', () => {
  const right = rampVelocity({ incline: 30, height: 80, direction: 1 }, 500);
  const left = rampVelocity({ incline: 30, height: 80, direction: -1 }, 500);
  assert.ok(Math.abs(left.x + right.x) < 1e-9);
  assert.ok(Math.abs(left.y - right.y) < 1e-9);
});

test('rampVelocity: higher ramp height -> faster', () => {
  const low = rampVelocity({ incline: 30, height: 40, direction: 1 }, 500);
  const high = rampVelocity({ incline: 30, height: 80, direction: 1 }, 500);
  assert.ok(length(high) > length(low));
});

test('rampVelocity: speed is independent of incline angle (same height/g)', () => {
  const a = rampVelocity({ incline: 10, height: 80, direction: 1 }, 500);
  const b = rampVelocity({ incline: 60, height: 80, direction: 1 }, 500);
  assert.ok(Math.abs(length(a) - length(b)) < 1e-9);
});

test('rampVelocity does not mutate the input settings object', () => {
  const settings = Object.freeze({ incline: 30, height: 80, direction: 1 });
  assert.doesNotThrow(() => rampVelocity(settings, 500));
});

test('rampVelocity leaves the settings object deep-equal before/after call', () => {
  const settings = { incline: 45, height: 100, direction: -1 };
  const before = { ...settings };
  rampVelocity(settings, 400);
  assert.deepEqual(settings, before);
});
