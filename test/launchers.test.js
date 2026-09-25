import test from 'node:test';
import assert from 'node:assert/strict';
import { length } from '../src/vec2.js';
import { cannonVelocity, rampVelocity, planetForce, PLANET_G } from '../src/launchers.js';

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

// --- planetForce ----------------------------------------------------------

const PLANET = { pos: { x: 0, y: 0 }, radius: 40, mass: 1000 };

test('planetForce: points toward the centre from the right (body at +x)', () => {
  const body = { pos: { x: 100, y: 0 }, mass: 1 };
  const f = planetForce(PLANET, body);
  assert.ok(f.x < 0, 'force should pull toward -x (toward the centre)');
  assertClose({ x: f.y, y: 0 }, { x: 0, y: 0 }, 1e-9);
});

test('planetForce: points toward the centre from the left (body at -x)', () => {
  const body = { pos: { x: -100, y: 0 }, mass: 1 };
  const f = planetForce(PLANET, body);
  assert.ok(f.x > 0, 'force should pull toward +x (toward the centre)');
  assertClose({ x: f.y, y: 0 }, { x: 0, y: 0 }, 1e-9);
});

test('planetForce: points toward the centre from below (body at +y)', () => {
  const body = { pos: { x: 0, y: 100 }, mass: 1 };
  const f = planetForce(PLANET, body);
  assert.ok(f.y < 0, 'force should pull toward -y (toward the centre)');
  assertClose({ x: 0, y: f.x }, { x: 0, y: 0 }, 1e-9);
});

test('planetForce: points toward the centre from above (body at -y)', () => {
  const body = { pos: { x: 0, y: -100 }, mass: 1 };
  const f = planetForce(PLANET, body);
  assert.ok(f.y > 0, 'force should pull toward +y (toward the centre)');
  assertClose({ x: 0, y: f.x }, { x: 0, y: 0 }, 1e-9);
});

test('planetForce: points toward the centre from an off-axis direction', () => {
  const body = { pos: { x: 100, y: 100 }, mass: 1 };
  const f = planetForce(PLANET, body);
  assert.ok(f.x < 0 && f.y < 0, 'force should pull toward the origin (-x, -y)');
  // Should point exactly along the diagonal back to the centre.
  assertClose(f, { x: f.y, y: f.y }, 1e-9);
});

test('planetForce: inverse-square falloff — doubling distance quarters the magnitude', () => {
  const near = planetForce(PLANET, { pos: { x: 100, y: 0 }, mass: 1 });
  const far = planetForce(PLANET, { pos: { x: 200, y: 0 }, mass: 1 });
  assert.ok(Math.abs(length(far) - length(near) / 4) < 1e-6);
});

test('planetForce: scales linearly with body.mass', () => {
  const f1 = planetForce(PLANET, { pos: { x: 100, y: 0 }, mass: 1 });
  const f3 = planetForce(PLANET, { pos: { x: 100, y: 0 }, mass: 3 });
  assert.ok(Math.abs(length(f3) - length(f1) * 3) < 1e-9);
});

test('planetForce: scales linearly with planet.mass', () => {
  const body = { pos: { x: 100, y: 0 }, mass: 1 };
  const f1 = planetForce({ ...PLANET, mass: 1000 }, body);
  const f2 = planetForce({ ...PLANET, mass: 2000 }, body);
  assert.ok(Math.abs(length(f2) - length(f1) * 2) < 1e-9);
});

test('planetForce: finite and non-NaN at d = 0 (softened by planet.radius^2)', () => {
  const body = { pos: { x: 0, y: 0 }, mass: 1 };
  const f = planetForce(PLANET, body);
  assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), 'force must be finite, not NaN/Infinity');
  // At d = 0, normalize(d) is the zero vector, so the softened force is
  // exactly zero (direction is undefined, magnitude is capped but has no
  // direction to point in) — this must not throw or produce NaN.
  assert.equal(f.x, 0);
  assert.equal(f.y, 0);
});

test('planetForce: inside the planet radius, magnitude is capped at the softened value', () => {
  const atRadius = planetForce(PLANET, { pos: { x: PLANET.radius, y: 0 }, mass: 1 });
  const insideRadius = planetForce(PLANET, { pos: { x: PLANET.radius / 2, y: 0 }, mass: 1 });
  const expectedCapped = (PLANET_G * PLANET.mass * 1) / (PLANET.radius * PLANET.radius);

  assert.ok(Number.isFinite(insideRadius.x) && Number.isFinite(insideRadius.y));
  assert.ok(Math.abs(length(atRadius) - expectedCapped) < 1e-6);
  assert.ok(Math.abs(length(insideRadius) - expectedCapped) < 1e-6, 'force inside the radius should equal the softened cap, not grow further');
});

test('planetForce: does not mutate planet or body inputs', () => {
  const planet = Object.freeze({ pos: Object.freeze({ x: 0, y: 0 }), radius: 40, mass: 1000 });
  const body = Object.freeze({ pos: Object.freeze({ x: 100, y: 0 }), mass: 1 });
  assert.doesNotThrow(() => planetForce(planet, body));
});

test('PLANET_G is a positive finite constant', () => {
  assert.ok(Number.isFinite(PLANET_G) && PLANET_G > 0);
});

test('planetForce: tuning check — a power-400 cannon shot passing ~150 units from a {radius: 40, mass: 1000} planet is visibly deflected', () => {
  // Simulate a straight shot with no other forces, integrating with the same
  // semi-implicit Euler pattern step() uses, to sanity-check the PLANET_G
  // tuning independent of physics.js.
  const planet = { pos: { x: 480, y: 270 }, radius: 40, mass: 1000 };
  const dt = 1 / 120;
  let body = { pos: { x: 0, y: 420 }, vel: { x: 400, y: 0 }, mass: 1 }; // passes 150 below the planet
  const startVel = { ...body.vel };

  for (let i = 0; i < 240; i++) {
    const f = planetForce(planet, body);
    const vel = { x: body.vel.x + (f.x / body.mass) * dt, y: body.vel.y + (f.y / body.mass) * dt };
    const pos = { x: body.pos.x + vel.x * dt, y: body.pos.y + vel.y * dt };
    body = { pos, vel, mass: body.mass };
  }

  const headingChangeDeg =
    (Math.abs(Math.atan2(body.vel.y, body.vel.x) - Math.atan2(startVel.y, startVel.x)) * 180) / Math.PI;

  assert.ok(headingChangeDeg > 5, `expected a visibly bent trajectory (>5deg), got ${headingChangeDeg.toFixed(2)}deg`);
});
