# Stage 5: Collision: bounce, target-hit, rest + attempt status

- **Type:** feature
- **Depends on:** 2

## Objectives

Pure collision predicates and responses (architecture §Collision): wall/ground **bounce** with
restitution, **target-hit** by circle overlap, **rest** detection below a speed epsilon — plus
the `attemptStatus` rule that tells the game loop when an attempt is over.

## What to build

- `src/collision.js` — every export in `contracts/scoring.md` §Collision + attempt status:
  `RESTITUTION, FRICTION, REST_SPEED, MAX_ATTEMPT_SECONDS, bounceOffBounds, bounceOffRect,
  isTargetHit, isAtRest, isSupported, resolveCollisions, attemptStatus`.
  - All pure (return new bodies/worlds), DOM-free; imports `src/vec2.js` only.
  - `bounceOffBounds`: left/right/bottom edges only; **top is open**.
  - `bounceOffRect`: circle vs axis-aligned rect using the closest point on the rect; push the
    body out along the normal; reflect normal velocity × restitution; tangential × `FRICTION`;
    zero a reflected normal speed below `REST_SPEED`. Handle the centre-inside-rect case
    (push out along the shallowest axis) without NaN.
  - `resolveCollisions`: walls, then bounds, then mark overlapped targets `hit: true`
    (hits are sticky).
- `test/collision.test.js`.

The game loop (stage 9) will call, per fixed substep: `world = resolveCollisions(step(world, FIXED_DT))`.

## Interface contracts

- **Exposes:** `src/collision.js` (contracts/scoring.md — frozen v1).
- **Consumes:** `World`/`Body`/`Target`/`Rect` shapes (contracts/world-model.md); `createWorld`,
  `createBody`, `step` in tests.

## Testing requirements

- **Bounce:** a body moving down into the ground at 100 u/s leaves with `vel.y ≈ −60`
  (restitution 0.6), position clamped so it no longer penetrates; same for left and right
  walls; a body above the top edge is **not** bounced.
- **Rect bounce:** hitting a rect's top face reflects `vel.y`; hitting its side reflects `vel.x`;
  centre-inside case produces finite numbers.
- **Micro-bounce kill + friction:** a slow landing (normal speed < `REST_SPEED` after reflect)
  ends with `vel.y === 0`; tangential speed is multiplied by `FRICTION`.
- **Target-hit:** overlap exactly at `r1 + r2` → true; just beyond → false;
  `resolveCollisions` marks the hit and a later non-overlapping world keeps `hit: true`.
- **Rest:** `isAtRest` true below `REST_SPEED`, false at/above it; a ball dropped onto the
  ground and simulated with `resolveCollisions(step(…))` reaches `attemptStatus === 'rest'`
  within 10 s of sim time; a ball at the apex of a vertical shot (speed ≈ 0, mid-air) is
  **not** `rest`.
- **attemptStatus precedence:** all targets hit → `'all-hit'` even if at rest; timeout at
  `MAX_ATTEMPT_SECONDS`; otherwise `'running'`.

## Acceptance conditions

- [ ] Kill-switch: **N/A — dark by construction.** Pure module, no UI surface until stage 9 (see assessment).
- [ ] UI-smoke: N/A for this stage; covered by stage 9/10's UI-smoke.
- [ ] Additive migration only (no destructive schema change) — no persisted data touched.
- [ ] Bounce, target-hit and rest are each unit-tested as above
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
