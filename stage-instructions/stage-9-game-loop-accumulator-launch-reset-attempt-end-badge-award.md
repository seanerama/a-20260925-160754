# Stage 9: Game loop: accumulator, Launch/Reset, attempt end + badge award

- **Type:** feature
- **Depends on:** 5, 6, 7, 8

## Objectives

Make Star Lab **playable end-to-end** on level 1: aim the cannon (angle + power), press
**Launch**, watch the ball fly under fixed-step physics, hit the target, and see a **star
badge** awarded and persisted. This is the first stage that satisfies the spec's UI-smoke.

## What to build

- `src/physics.js` — add `MAX_FRAME_SECONDS` and `substeps(accumulator, frameSeconds, dt)`
  per `contracts/world-model.md` (additive). Guard float error: `steps = Math.floor((acc + 1e-9) / dt)`.
- `index.html` — inside `#controls`: an **Angle** slider (0–90°, live value label), a
  **Power** slider (100–900, live value label), a **Launch** button, a **Reset** button, and a
  status line (`#status`, e.g. "Launches: 2 — Aim and press Launch!"). Large, kid-friendly
  hit targets; labelled with `<label for>`.
- `src/main.js` — the glue (DOM lives only here):
  - State: `level` (`LEVELS[0]` for now), `world = loadLevel(level)`, `launches = 0`,
    `attempt = null | { elapsed }`, `result = null | { solved, stars }`, `accumulator = 0`,
    selected launcher = first cannon/ramp in `level.launchers`, angle/power initialised from it.
  - **Launch** (disabled while an attempt is running): `launches += 1`; rebuild targets fresh
    (`world = loadLevel(level)` so each attempt starts with every target un-hit); add
    `spawnBody(selected launcher with the slider angle/power, { mass: 1, gravity: world.gravity })`;
    start the attempt.
  - **Loop** (`requestAnimationFrame`): `{ steps, accumulator } = substeps(accumulator, frameDelta)`;
    per substep `world = resolveCollisions(step(world, FIXED_DT))`, `attempt.elapsed += FIXED_DT`,
    and stop stepping once `attemptStatus(world, attempt.elapsed) !== 'running'`. Then call
    `render(ctx, world, level, view)` every frame.
  - **Attempt end:** count `targetsHit`; `result = score({ targetsHit, targetsTotal, launches },
    level.starThresholds)`; if solved `saveBadge(localStorage, level.id, result.stars)` and
    reset `launches = 0` for the next run; draw `drawBadge` over the scene until the player
    presses Launch or Reset. Wrap `localStorage` access in try/catch (private mode) — the game
    must still play without persistence.
  - **Reset:** clears the flying body, result overlay and attempt; rebuilds the world from the
    level; does **not** reset `launches` (so Reset is not a free 3-star cheat).
  - Aim preview (nice-to-have): pass the angle to `render`'s `view.angle` so the barrel turns
    as the slider moves.
- `docs/ui-smoke.md` — the UI-smoke asset the Operator/grader runs (numbered steps + expected
  observations; include the angle/power that solves level 1).
- `test/loop.test.js` — `substeps` unit tests, plus a **headless integration test** that drives
  the same pure pipeline main.js uses (loadLevel → spawnBody → loop of
  `resolveCollisions(step())` via `substeps` fed 1/60 s frames → `attemptStatus` → `score`)
  on level 1 with the documented solving angle/power and asserts `{ solved: true, stars: 3 }`.

## Interface contracts

- **Exposes:** the playable page; `substeps`, `MAX_FRAME_SECONDS` (world-model, additive).
- **Consumes:** world-model (`step`, `FIXED_DT`), level-schema (`LEVELS`, `loadLevel`,
  `spawnBody`), scoring (`resolveCollisions`, `attemptStatus`, `score`, `saveBadge`),
  `render`/`drawBadge` (stage 8). **Do not re-implement scoring or collision in main.js** (ADR-0004).

## Testing requirements

- `substeps`: 1/60 s frame at dt 1/120 ⇒ 2 steps, remainder ≈ 0; 1/144 s frames accumulate
  and emit a step only once ≥ dt; a 5 s frame is capped to `MAX_FRAME_SECONDS` (30 steps).
- The headless integration test above.
- **UI-smoke** (`docs/ui-smoke.md`, run it and paste the result in the PR): serve over http,
  open `index.html`, set the documented angle/power, press **Launch**, the ball flies and hits
  the target, a star badge overlay appears; reload the page — no console errors; `localStorage`
  key `starlab.badges.v1` holds the level-1 stars.

## Acceptance conditions

- [ ] Kill-switch: **N/A** — this *is* the product's primary surface on an unreleased static page; a default-OFF flag would hide the spec's own UI-smoke from the grader (decision recorded in the assessment).
- [ ] UI-smoke "observably-works" check authored in `docs/ui-smoke.md` and executed: aim → Launch → hit → star badge
- [ ] Additive migration only — `localStorage` badge key only written via `saveBadge`; tolerant of storage being unavailable
- [ ] Fixed-step accumulator loop drives the same `step` the tests use; `substeps` unit-tested
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
