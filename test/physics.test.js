import test from 'node:test';
import assert from 'node:assert/strict';
import { FIXED_DT, WORLD_WIDTH, WORLD_HEIGHT, createWorld, createBody, step } from '../src/physics.js';

const EPS = 1e-9;

function assertCloseNum(actual, expected, eps = EPS, msg = '') {
  assert.ok(
    Math.abs(actual - expected) < eps,
    `${msg} expected ${expected}, got ${actual} (diff ${Math.abs(actual - expected)})`,
  );
}

function runSteps(world, n, dt = FIXED_DT) {
  let w = world;
  for (let i = 0; i < n; i++) {
    w = step(w, dt);
  }
  return w;
}

test('createWorld() defaults match the frozen contract', () => {
  const world = createWorld();
  assert.deepEqual(world.gravity, { x: 0, y: 500 });
  assert.deepEqual(world.bounds, { x: 0, y: 0, w: 960, h: 540 });
  assert.deepEqual(world.bodies, []);
  assert.deepEqual(world.planets, []);
  assert.deepEqual(world.targets, []);
  assert.deepEqual(world.walls, []);
  assert.equal(WORLD_WIDTH, 960);
  assert.equal(WORLD_HEIGHT, 540);
});

test('createWorld() copies arrays rather than aliasing the caller\'s', () => {
  const bodies = [createBody()];
  const planets = [];
  const world = createWorld({ bodies, planets });
  assert.notEqual(world.bodies, bodies);
  assert.notEqual(world.planets, planets);
  bodies.push(createBody());
  assert.equal(world.bodies.length, 1);
});

test('createBody() defaults', () => {
  const body = createBody();
  assert.deepEqual(body.pos, { x: 0, y: 0 });
  assert.deepEqual(body.vel, { x: 0, y: 0 });
  assert.equal(body.mass, 1);
  assert.equal(body.radius, 12);
  assert.equal(body.kind, 'ball');
});

test('known trajectory: matches the closed-form semi-implicit-Euler value', () => {
  const g = 500;
  const N = 120;
  const body = createBody({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } });
  const world = createWorld({ gravity: { x: 0, y: g }, bodies: [body] });

  const result = runSteps(world, N);
  const b = result.bodies[0];

  const expectedVelY = g * FIXED_DT * N;
  const expectedPosY = g * FIXED_DT * FIXED_DT * (N * (N + 1)) / 2;

  assertCloseNum(b.vel.y, expectedVelY, 1e-9, 'vel.y');
  assertCloseNum(b.pos.y, expectedPosY, 1e-9, 'pos.y');

  // Sanity check: within 2% of the continuous 1/2 g t^2.
  const t = N * FIXED_DT;
  const continuousPosY = 0.5 * g * t * t;
  const relError = Math.abs(b.pos.y - continuousPosY) / continuousPosY;
  assert.ok(relError < 0.02, `expected within 2% of continuous, got relError ${relError}`);

  // x is untouched.
  assertCloseNum(b.vel.x, 0);
  assertCloseNum(b.pos.x, 0);
});

test('determinism: two independent runs of the same world for 500 steps are deep-equal', () => {
  const makeWorld = () =>
    createWorld({
      gravity: { x: 0, y: 500 },
      bodies: [
        createBody({ pos: { x: 10, y: 20 }, vel: { x: 30, y: -5 }, mass: 2 }),
        createBody({ pos: { x: -5, y: 100 }, vel: { x: 0, y: 0 }, mass: 0.5 }),
      ],
    });

  const resultA = runSteps(makeWorld(), 500);
  const resultB = runSteps(makeWorld(), 500);

  assert.deepEqual(resultA, resultB);
});

test('purity: step() never mutates the input world or its bodies\' vectors', () => {
  const world = createWorld({
    gravity: { x: 0, y: 500 },
    bodies: [createBody({ pos: { x: 1, y: 2 }, vel: { x: 3, y: 4 } })],
  });
  const before = JSON.parse(JSON.stringify(world));

  const result = step(world, FIXED_DT);

  assert.deepEqual(world, before, 'input world mutated by step()');
  assert.notEqual(result, world, 'step() should return a NEW world object');
  assert.notEqual(result.bodies[0], world.bodies[0], 'step() should return NEW body objects');
  assert.notEqual(result.bodies[0].pos, world.bodies[0].pos, 'step() should return NEW pos vectors');
  assert.notEqual(result.bodies[0].vel, world.bodies[0].vel, 'step() should return NEW vel vectors');
});

test('mass & momentum: bodies of different mass fall identically under uniform gravity', () => {
  const light = createBody({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: 0.5 });
  const heavy = createBody({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, mass: 50 });
  const world = createWorld({ gravity: { x: 0, y: 500 }, bodies: [light, heavy] });

  const result = runSteps(world, 200);
  const [lightAfter, heavyAfter] = result.bodies;

  assertCloseNum(lightAfter.pos.y, heavyAfter.pos.y, 1e-9, 'pos.y should match regardless of mass');
  assertCloseNum(lightAfter.vel.y, heavyAfter.vel.y, 1e-9, 'vel.y should match regardless of mass');
});

test('mass & momentum: horizontal velocity is unaffected by gravity (no drag, no x-force)', () => {
  const body = createBody({ pos: { x: 0, y: 0 }, vel: { x: 42, y: 0 } });
  const world = createWorld({ gravity: { x: 0, y: 500 }, bodies: [body] });

  const result = runSteps(world, 300);
  const b = result.bodies[0];

  assertCloseNum(b.vel.x, 42, 1e-9, 'vel.x should stay constant');
  assertCloseNum(b.pos.x, 42 * FIXED_DT * 300, 1e-9, 'pos.x should advance at constant vel.x');
});

test('step() with zero bodies/planets is a no-op that still returns a new world', () => {
  const world = createWorld();
  const result = step(world, FIXED_DT);
  assert.deepEqual(result.bodies, []);
  assert.notEqual(result, world);
});

// --- stage 4: planet radial gravity wired into step() -------------------

test('planet pull: a body at rest 200 units right of a planet moves toward it (x decreases), zero uniform gravity', () => {
  const planet = { pos: { x: 480, y: 270 }, radius: 40, mass: 1000 };
  const body = createBody({ pos: { x: 680, y: 270 }, vel: { x: 0, y: 0 } });
  const world = createWorld({ gravity: { x: 0, y: 0 }, bodies: [body], planets: [planet] });

  const result = runSteps(world, 30);
  const b = result.bodies[0];

  assert.ok(b.pos.x < 680, `expected x to decrease toward the planet, got ${b.pos.x}`);
  assert.ok(b.vel.x < 0, `expected leftward velocity toward the planet, got ${b.vel.x}`);
  // No off-axis drift: body starts exactly horizontal from the planet.
  assertCloseNum(b.pos.y, 270, 1e-9, 'pos.y');
  assertCloseNum(b.vel.y, 0, 1e-9, 'vel.y');
});

test('planet pull: acceleration under a planet is independent of body mass (zero uniform gravity)', () => {
  const planet = { pos: { x: 480, y: 270 }, radius: 40, mass: 1000 };
  const light = createBody({ pos: { x: 680, y: 270 }, vel: { x: 0, y: 0 }, mass: 0.5 });
  const heavy = createBody({ pos: { x: 680, y: 270 }, vel: { x: 0, y: 0 }, mass: 50 });
  const world = createWorld({ gravity: { x: 0, y: 0 }, bodies: [light, heavy], planets: [planet] });

  const result = runSteps(world, 30);
  const [lightAfter, heavyAfter] = result.bodies;

  assertCloseNum(lightAfter.pos.x, heavyAfter.pos.x, 1e-9, 'pos.x should match regardless of mass');
  assertCloseNum(lightAfter.vel.x, heavyAfter.vel.x, 1e-9, 'vel.x should match regardless of mass');
});

test('slingshot: a body flying past a planet ends with a deflected heading vs. the same run with no planet', () => {
  const planet = { pos: { x: 480, y: 270 }, radius: 40, mass: 1000 };
  const makeBody = () => createBody({ pos: { x: 0, y: 420 }, vel: { x: 400, y: 0 } });

  const withPlanet = createWorld({ gravity: { x: 0, y: 0 }, bodies: [makeBody()], planets: [planet] });
  const withoutPlanet = createWorld({ gravity: { x: 0, y: 0 }, bodies: [makeBody()] });

  const resultWith = runSteps(withPlanet, 240);
  const resultWithout = runSteps(withoutPlanet, 240);

  const bWith = resultWith.bodies[0];
  const bWithout = resultWithout.bodies[0];

  // Without the planet, a straight shot with no gravity keeps heading 0.
  assertCloseNum(bWithout.vel.y, 0, 1e-9, 'no-planet vel.y should stay 0');

  const headingWith = Math.atan2(bWith.vel.y, bWith.vel.x);
  const headingWithout = Math.atan2(bWithout.vel.y, bWithout.vel.x);

  assert.notEqual(headingWith, headingWithout, 'heading should be deflected by the planet');
  // The pull is toward the planet, which sits above the flight path (smaller
  // y), so the deflection bends velocity upward (negative y).
  assert.ok(bWith.vel.y < bWithout.vel.y, 'velocity should deflect toward the planet (upward, -y)');
});

test('determinism: two independent runs with a planet present are deep-equal', () => {
  const makeWorld = () =>
    createWorld({
      gravity: { x: 0, y: 500 },
      bodies: [
        createBody({ pos: { x: 10, y: 20 }, vel: { x: 30, y: -5 }, mass: 2 }),
        createBody({ pos: { x: 700, y: 400 }, vel: { x: -50, y: 0 }, mass: 0.5 }),
      ],
      planets: [{ pos: { x: 480, y: 270 }, radius: 40, mass: 1000 }],
    });

  const resultA = runSteps(makeWorld(), 500);
  const resultB = runSteps(makeWorld(), 500);

  assert.deepEqual(resultA, resultB);
});

test('regression: a planet-free world behaves exactly as in stage 2 (empty planets array is a no-op)', () => {
  const body = createBody({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 } });
  const world = createWorld({ gravity: { x: 0, y: 500 }, bodies: [body], planets: [] });

  const result = runSteps(world, 120);
  const b = result.bodies[0];

  assertCloseNum(b.vel.y, 500 * FIXED_DT * 120, 1e-9, 'vel.y');
  assertCloseNum(b.pos.x, 0);
  assertCloseNum(b.vel.x, 0);
});
