# Stage 6: Levels: declarative schema, loadLevel validator, three levels

- **Type:** feature
- **Depends on:** 2, 4, 5

## Objectives

Make the engine data-driven (ADR-0003): every puzzle is a declarative `Level` object; one
`loadLevel` validates it and builds a `World`. Ship **three solvable levels of increasing
difficulty**, each exercising a different launcher, and prove they are solvable in tests.

## What to build

- `src/levels.js` — exactly the exports in `contracts/level-schema.md` §Levels:
  `LEVELS`, `validateLevel`, `loadLevel`, `LevelError`, `spawnBody`.
  - `validateLevel` returns **all** errors (not just the first), never throws, and rejects
    every case listed under "Validation MUST reject" in the contract.
  - `loadLevel` maps the level to a `World` per the contract's mapping table, deep-copying
    so the returned world never aliases `LEVELS` data.
  - `spawnBody(launcher, { mass, gravity })` uses `cannonVelocity` / `rampVelocity`.
- The three levels (tune numbers so the solvability test passes; keep them fun, not fiddly):
  1. **"First Flight"** — one cannon at the left, uniform gravity `{0, 500}`, one ground-level
     target across the field, no obstacles. Solvable within ±10° / ±100 power of the
     cannon's default settings. `starThresholds { three: 1, two: 3 }`.
  2. **"Ramp Run"** — a ramp (and a cannon as the alternative) plus a low obstacle; one target
     the ramp reaches as-built at level gravity. `starThresholds { three: 1, two: 3 }`.
  3. **"Planet Slingshot"** — a cannon, a `planet` launcher, and a tall obstacle wall blocking
     the direct shot; the target sits behind the wall and needs the planet's pull to reach.
     May use two targets. `starThresholds { three: 2, two: 5 }`.
- `test/simulate.js` (helper, **not** a `*.test.js`): `simulateAttempt(world, body)` runs
  `resolveCollisions(step(world, FIXED_DT))` from a world with the body added until
  `attemptStatus(…) !== 'running'`, returning `{ status, world }`. Stage 9's game loop must use
  the same per-substep composition.
- `test/levels.test.js`.

## Interface contracts

- **Exposes:** `src/levels.js` (contracts/level-schema.md — frozen v1).
- **Consumes:** `createWorld`, `createBody`, `step`, `FIXED_DT` (world-model); `cannonVelocity`,
  `rampVelocity` (level-schema launchers); `resolveCollisions`, `attemptStatus` (scoring
  contract, collision section — in tests).

## Testing requirements

- Every entry of `LEVELS` passes `validateLevel` (`[]`), ids are unique, `LEVELS.length ≥ 3`.
- `loadLevel` of a valid level returns a world with the mapped gravity, planets (from
  `type: 'planet'`), targets with `hit: false`, walls from obstacles, `bodies: []`, bounds
  960×540; mutating that world does not change `LEVELS`.
- **Invalid levels are rejected:** a table-driven test over ≥ 8 malformed variants (one per
  contract rule) asserts `validateLevel` reports an error and `loadLevel` throws `LevelError`
  with `.errors.length ≥ 1`.
- **Solvability:** for each level, a coarse grid search (e.g. cannon angle step 5°, power
  step 25, mass 1; ramp as-built) over its cannon/ramp launchers finds at least one
  `simulateAttempt` whose status is `'all-hit'`. Level 1 additionally within ±10°/±100 of its
  defaults. Level 3 is **not** solvable when its planet is removed (proves the slingshot matters).
  Keep the whole file under ~10 s (stop at the first success).
- `spawnBody` builds the contract body for cannon and ramp, throws for planet.

## Acceptance conditions

- [ ] Kill-switch: **N/A — dark by construction.** Level data is not reachable from the UI until stage 9/10 (see assessment).
- [ ] UI-smoke: N/A for this stage; stages 9/10's UI-smoke plays these levels.
- [ ] Additive migration only (no destructive schema change) — schema is new; no persisted data.
- [ ] ≥ 3 declarative levels ship; `loadLevel` rejects invalid levels (unit-tested); every level is proven solvable
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
