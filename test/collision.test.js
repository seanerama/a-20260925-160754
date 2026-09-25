import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, createBody, step, FIXED_DT } from '../src/physics.js';
import {
  RESTITUTION,
  FRICTION,
  REST_SPEED,
  MAX_ATTEMPT_SECONDS,
  bounceOffBounds,
  bounceOffRect,
  isTargetHit,
  isAtRest,
  isSupported,
  resolveCollisions,
  attemptStatus,
} from '../src/collision.js';

const EPS = 1e-9;

function assertCloseNum(actual, expected, eps = EPS, msg = '') {
  assert.ok(
    Math.abs(actual - expected) < eps,
    `${msg} expected ${expected}, got ${actual} (diff ${Math.abs(actual - expected)})`,
  );
}

// --- 1. bounceOffBounds: bounce off ground/left/right, top is open --------

test('bounceOffBounds: body moving down into the ground at 100 u/s bounces up at ~60 u/s (restitution 0.6)', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  const body = createBody({ pos: { x: 480, y: 545 }, vel: { x: 0, y: 100 }, radius: 10 });

  const result = bounceOffBounds(body, bounds);

  assertCloseNum(result.vel.y, -60, 1e-9, 'vel.y');
  assert.ok(result.pos.y + result.radius <= bounds.h + 1e-9, 'position clamped, no longer penetrating ground');
  assertCloseNum(result.pos.y, bounds.h - body.radius, 1e-9, 'pos.y clamped to ground edge');
});

test('bounceOffBounds: body moving left into the left wall bounces right at ~60 u/s', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  const body = createBody({ pos: { x: -5, y: 100 }, vel: { x: -100, y: 0 }, radius: 10 });

  const result = bounceOffBounds(body, bounds);

  assertCloseNum(result.vel.x, 60, 1e-9, 'vel.x');
  assertCloseNum(result.pos.x, bounds.x + body.radius, 1e-9, 'pos.x clamped to left edge');
});

test('bounceOffBounds: body moving right into the right wall bounces left at ~60 u/s', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  const body = createBody({ pos: { x: 965, y: 100 }, vel: { x: 100, y: 0 }, radius: 10 });

  const result = bounceOffBounds(body, bounds);

  assertCloseNum(result.vel.x, -60, 1e-9, 'vel.x');
  assertCloseNum(result.pos.x, bounds.x + bounds.w - body.radius, 1e-9, 'pos.x clamped to right edge');
});

test('bounceOffBounds: a body above the top edge is NOT bounced (top is open)', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  const body = createBody({ pos: { x: 480, y: -50 }, vel: { x: 3, y: -200 }, radius: 10 });

  const result = bounceOffBounds(body, bounds);

  assert.deepEqual(result.pos, body.pos, 'position unchanged above top edge');
  assert.deepEqual(result.vel, body.vel, 'velocity unchanged above top edge');
});

test('bounceOffBounds: pure — never mutates the input body', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  const body = createBody({ pos: { x: 480, y: 545 }, vel: { x: 0, y: 100 }, radius: 10 });
  const before = JSON.parse(JSON.stringify(body));

  const result = bounceOffBounds(body, bounds);

  assert.deepEqual(body, before, 'input body mutated');
  assert.notEqual(result, body);
  assert.notEqual(result.pos, body.pos);
  assert.notEqual(result.vel, body.vel);
});

// --- 2. bounceOffRect: top face, side face, centre-inside -----------------

test('bounceOffRect: hitting the top face reflects vel.y', () => {
  const rect = { x: 100, y: 100, w: 200, h: 50 };
  const body = createBody({ pos: { x: 200, y: 95 }, vel: { x: 0, y: 100 }, radius: 10 });

  const result = bounceOffRect(body, rect);

  assertCloseNum(result.vel.y, -60, 1e-9, 'vel.y reflected off top face');
  assertCloseNum(result.vel.x, 0, 1e-9, 'vel.x untouched (tangential, was 0)');
  assert.ok(result.pos.y + result.radius <= rect.y + 1e-9, 'pushed out above the rect top');
});

test('bounceOffRect: hitting a side face reflects vel.x', () => {
  const rect = { x: 100, y: 100, w: 200, h: 50 };
  // Approach from the left, aligned vertically with the rect's middle.
  const body = createBody({ pos: { x: 95, y: 125 }, vel: { x: 100, y: 0 }, radius: 10 });

  const result = bounceOffRect(body, rect);

  assertCloseNum(result.vel.x, -60, 1e-9, 'vel.x reflected off left face');
  assertCloseNum(result.vel.y, 0, 1e-9, 'vel.y untouched (tangential, was 0)');
  assert.ok(result.pos.x + result.radius <= rect.x + 1e-9, 'pushed out to the left of the rect');
});

test('bounceOffRect: centre-inside-rect case produces finite numbers (no NaN)', () => {
  const rect = { x: 100, y: 100, w: 200, h: 50 };
  const body = createBody({ pos: { x: 200, y: 125 }, vel: { x: 30, y: -40 }, radius: 10 });

  const result = bounceOffRect(body, rect);

  assert.ok(Number.isFinite(result.pos.x) && Number.isFinite(result.pos.y), 'pos finite');
  assert.ok(Number.isFinite(result.vel.x) && Number.isFinite(result.vel.y), 'vel finite');
  // Body should be pushed out along the shallowest axis (here: up, since
  // 125 - 100 = 25 < 200 - 125, 150 - 100 = 50, wait use nearest edge check).
  const outside =
    result.pos.x + result.radius <= rect.x ||
    result.pos.x - result.radius >= rect.x + rect.w ||
    result.pos.y + result.radius <= rect.y ||
    result.pos.y - result.radius >= rect.y + rect.h;
  assert.ok(outside, 'body pushed fully outside the rect');
});

test('bounceOffRect: pure — never mutates the input body or rect', () => {
  const rect = { x: 100, y: 100, w: 200, h: 50 };
  const body = createBody({ pos: { x: 200, y: 95 }, vel: { x: 0, y: 100 }, radius: 10 });
  const bodyBefore = JSON.parse(JSON.stringify(body));
  const rectBefore = JSON.parse(JSON.stringify(rect));

  const result = bounceOffRect(body, rect);

  assert.deepEqual(body, bodyBefore);
  assert.deepEqual(rect, rectBefore);
  assert.notEqual(result, body);
});

// --- 3. micro-bounce kill + friction ---------------------------------------

test('bounceOffBounds: a slow landing (reflected normal speed < REST_SPEED) ends with vel.y === 0 exactly', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  // Incoming speed 100 * restitution 0.6 = 6 (>= REST_SPEED) would NOT be
  // killed; pick a small incoming speed so the reflected speed lands below
  // REST_SPEED (5): 100 * 0.06... instead just use incoming = 5 -> reflected
  // = 3, which is < REST_SPEED.
  const body = createBody({ pos: { x: 480, y: 545 }, vel: { x: 20, y: 5 }, radius: 10 });

  const result = bounceOffBounds(body, bounds);

  assert.equal(result.vel.y, 0, 'micro-bounce killed exactly to 0');
  assertCloseNum(result.vel.x, 20 * FRICTION, 1e-9, 'tangential speed multiplied by FRICTION');
});

test('bounceOffRect: a slow landing on the top face kills vel.y exactly to 0 and applies friction tangentially', () => {
  const rect = { x: 100, y: 100, w: 200, h: 50 };
  const body = createBody({ pos: { x: 200, y: 95 }, vel: { x: 20, y: 5 }, radius: 10 });

  const result = bounceOffRect(body, rect);

  assert.equal(result.vel.y, 0, 'micro-bounce killed exactly to 0');
  assertCloseNum(result.vel.x, 20 * FRICTION, 1e-9, 'tangential speed multiplied by FRICTION');
});

// --- 4. target-hit + sticky resolveCollisions ------------------------------

test('isTargetHit: overlap exactly at r1 + r2 is a hit; just beyond is not', () => {
  const target = { pos: { x: 100, y: 100 }, radius: 20, hit: false };
  const bodyTouching = createBody({ pos: { x: 100 + 30, y: 100 }, radius: 10 }); // dist 30 == 10+20
  const bodyBeyond = createBody({ pos: { x: 100 + 30.01, y: 100 }, radius: 10 });

  assert.equal(isTargetHit(bodyTouching, target), true);
  assert.equal(isTargetHit(bodyBeyond, target), false);
});

test('resolveCollisions: marks an overlapped target hit, and hits are sticky across later non-overlapping calls', () => {
  const target = { pos: { x: 500, y: 270 }, radius: 15, hit: false };
  const body = createBody({ pos: { x: 500, y: 270 }, vel: { x: 0, y: 0 }, radius: 10 });
  const world = createWorld({ bodies: [body], targets: [target] });

  const afterHit = resolveCollisions(world);
  assert.equal(afterHit.targets[0].hit, true, 'target marked hit on overlap');

  // Later call with the body moved far away — hit must stay true (sticky).
  const movedBody = { ...body, pos: { x: 10, y: 10 } };
  const worldAfterMove = { ...afterHit, bodies: [movedBody] };
  const afterMove = resolveCollisions(worldAfterMove);

  assert.equal(afterMove.targets[0].hit, true, 'hit stays true even though bodies no longer overlap');
  assert.equal(isTargetHit(movedBody, target), false, 'sanity: bodies really do not overlap anymore');
});

test('resolveCollisions: pure — never mutates the input world', () => {
  const target = { pos: { x: 500, y: 270 }, radius: 15, hit: false };
  const body = createBody({ pos: { x: 500, y: 270 }, vel: { x: 0, y: 0 }, radius: 10 });
  const world = createWorld({ bodies: [body], targets: [target] });
  const before = JSON.parse(JSON.stringify(world));

  const result = resolveCollisions(world);

  assert.deepEqual(world, before, 'input world mutated');
  assert.notEqual(result, world);
});

// --- 5. rest detection -------------------------------------------------

test('isAtRest: true below REST_SPEED, false at/above it', () => {
  const slow = createBody({ vel: { x: 3, y: 0 } });
  const atThreshold = createBody({ vel: { x: REST_SPEED, y: 0 } });
  const fast = createBody({ vel: { x: 10, y: 0 } });

  assert.equal(isAtRest(slow), true);
  assert.equal(isAtRest(atThreshold), false, 'exactly REST_SPEED is not < REST_SPEED');
  assert.equal(isAtRest(fast), false);
});

test('a ball dropped onto the ground and simulated repeatedly reaches attemptStatus === "rest" within 10s', () => {
  let world = createWorld({
    gravity: { x: 0, y: 500 },
    bodies: [createBody({ pos: { x: 480, y: 100 }, vel: { x: 0, y: 0 }, radius: 12 })],
  });

  const maxSteps = Math.ceil(10 / FIXED_DT);
  let status = 'running';
  let elapsed = 0;

  for (let i = 0; i < maxSteps; i++) {
    world = resolveCollisions(step(world, FIXED_DT));
    elapsed += FIXED_DT;
    status = attemptStatus(world, elapsed);
    if (status !== 'running') break;
  }

  assert.equal(status, 'rest', `expected to settle to rest within 10s, got "${status}" after ${elapsed}s`);
});

test('a ball at the apex of a vertical shot (speed ~0, mid-air, not supported) is NOT rest', () => {
  const world = createWorld({
    gravity: { x: 0, y: 500 },
    bodies: [createBody({ pos: { x: 480, y: 270 }, vel: { x: 0, y: 0 }, radius: 12 })],
  });

  assert.equal(isAtRest(world.bodies[0]), true, 'sanity: speed is below REST_SPEED');
  assert.equal(isSupported(world.bodies[0], world), false, 'sanity: mid-air, not supported');
  assert.equal(attemptStatus(world, 1), 'running', 'apex mid-air must not report rest');
});

test('isSupported: true on the ground, true on top of an overlapping wall, false mid-air', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  const wall = { x: 400, y: 400, w: 100, h: 20 };
  const world = createWorld({ bounds, walls: [wall] });

  const onGround = createBody({ pos: { x: 480, y: 528 }, radius: 12 }); // bottom = 540
  const onWall = createBody({ pos: { x: 450, y: 388 }, radius: 12 }); // bottom = 400
  const midAir = createBody({ pos: { x: 480, y: 270 }, radius: 12 });

  assert.equal(isSupported(onGround, world), true);
  assert.equal(isSupported(onWall, world), true);
  assert.equal(isSupported(midAir, world), false);
});

// --- 6. attemptStatus precedence -------------------------------------------

test('attemptStatus: all targets hit -> "all-hit", even if the body is also at rest', () => {
  const bounds = { x: 0, y: 0, w: 960, h: 540 };
  const body = createBody({ pos: { x: 480, y: 528 }, vel: { x: 0, y: 0 }, radius: 12 });
  const target = { pos: { x: 480, y: 528 }, radius: 5, hit: true };
  const world = createWorld({ bounds, bodies: [body], targets: [target] });

  assert.equal(isAtRest(body), true, 'sanity: body is at rest too');
  assert.equal(isSupported(body, world), true, 'sanity: body is supported too');
  assert.equal(attemptStatus(world, 1), 'all-hit', 'all-hit takes precedence over rest');
});

test('attemptStatus: empty targets array is never "all-hit"', () => {
  const world = createWorld({ bodies: [createBody({ vel: { x: 0, y: 0 } })], targets: [] });
  assert.notEqual(attemptStatus(world, 0), 'all-hit');
});

test('attemptStatus: zero bodies never reports "rest"', () => {
  const world = createWorld({ bodies: [], targets: [{ pos: { x: 0, y: 0 }, radius: 5, hit: false }] });
  assert.notEqual(attemptStatus(world, 0), 'rest');
});

test('attemptStatus: timeout when elapsedSeconds >= MAX_ATTEMPT_SECONDS', () => {
  const world = createWorld({
    bodies: [createBody({ pos: { x: 480, y: 270 }, vel: { x: 40, y: -40 } })],
    targets: [{ pos: { x: 900, y: 500 }, radius: 5, hit: false }],
  });

  assert.equal(attemptStatus(world, MAX_ATTEMPT_SECONDS), 'timeout');
  assert.equal(attemptStatus(world, MAX_ATTEMPT_SECONDS + 5), 'timeout');
});

test('attemptStatus: otherwise "running"', () => {
  const world = createWorld({
    bodies: [createBody({ pos: { x: 480, y: 270 }, vel: { x: 40, y: -40 } })],
    targets: [{ pos: { x: 900, y: 500 }, radius: 5, hit: false }],
  });

  assert.equal(attemptStatus(world, 1), 'running');
});

// --- constants sanity --------------------------------------------------

test('exported constants match the frozen contract', () => {
  assert.equal(RESTITUTION, 0.6);
  assert.equal(FRICTION, 0.98);
  assert.equal(REST_SPEED, 5);
  assert.equal(MAX_ATTEMPT_SECONDS, 15);
});
