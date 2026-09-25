# Stage 2: Physics core: World model + deterministic fixed-timestep step()

- **Type:** feature
- **Depends on:** 1

## Objectives

Implement the deterministic physics heart (ADR-0002): the `World`/`Body` model and a pure
semi-implicit-Euler `step(world, dt)` at a fixed timestep, unit-tested against a known
trajectory.

## What to build

- `src/physics.js` — exactly the exports in `contracts/world-model.md` §`src/physics.js`:
  `FIXED_DT` (1/120), `WORLD_WIDTH` (960), `WORLD_HEIGHT` (540), `createWorld`, `createBody`,
  `step`.
  - `step` is **pure**: build and return a new world (new body objects/new vectors); never
    mutate the argument. Arrays other than `bodies` may be shallow-copied.
  - Force = `gravity × mass` (+ planet term — **leave a clearly marked seam**: iterate
    `world.planets` but contribute zero force in this stage; stage 4 fills it in).
  - Velocity first, then position with the updated velocity (semi-implicit).
  - No collision handling here (stage 5).
- `test/physics.test.js`.

## Interface contracts

- **Exposes:** `createWorld`, `createBody`, `step`, `FIXED_DT`, `WORLD_WIDTH/HEIGHT`
  (contracts/world-model.md — frozen v1).
- **Consumes:** `src/vec2.js` (stage 1).

## Testing requirements

- **Known trajectory:** a body at `{0,0}`, `vel {0,0}`, gravity `{0, 500}`, stepped N=120 times
  at `FIXED_DT`: assert `pos.y` equals the closed-form semi-implicit-Euler value
  `g·dt²·N(N+1)/2` (within 1e-9) and `vel.y === g·dt·N` (within 1e-9). Also assert it is
  within 2% of the continuous `½gt²` (sanity).
- **Determinism:** two independent runs of the same world for 500 steps are deep-equal.
- **Purity:** the input world (and its bodies' vectors) is unchanged after `step`.
- **Mass & momentum:** under uniform gravity two bodies of different mass fall identically;
  a body with initial horizontal velocity keeps `vel.x` constant (no drag).
- `createWorld()` defaults match the contract (gravity `{0,500}`, bounds 960×540, empty arrays).

## Acceptance conditions

- [ ] Kill-switch: **N/A — dark by construction.** Pure module with no user-facing surface; nothing in `src/main.js` imports it until stage 9. No flag is added (recorded in `feature-assessments/star-lab-initial-backlog-assessment.md`).
- [ ] UI-smoke: N/A for this stage (no user-facing surface); covered by stage 9/10's UI-smoke.
- [ ] Additive migration only (no destructive schema change) — no persisted data touched.
- [ ] `step` is deterministic and pure, and matches the known trajectory (tests above)
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
