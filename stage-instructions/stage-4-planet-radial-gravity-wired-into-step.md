# Stage 4: Planet radial gravity wired into step()

- **Type:** feature
- **Depends on:** 2, 3

## Objectives

The third launcher: a planet whose **radial gravity** pulls nearby bodies toward its centre so
players can slingshot around it (architecture §Launchers; ADR-0002 "each planet's radial
pull" is accumulated inside `step`).

## What to build

- `src/launchers.js` — add `PLANET_G` and `planetForce(planet, body)` exactly per
  `contracts/world-model.md` §Planet force (softened `r² = max(|d|², planet.radius²)`,
  force ∝ `planet.mass · body.mass / r²`, pointing toward the planet centre).
  Choose `PLANET_G` so that a planet `{ radius: 40, mass: 1000 }` visibly bends a
  power-400 cannon shot passing ~150 units away; document the choice in a comment.
- `src/physics.js` — fill the stage-2 seam: `step` sums `planetForce` over `world.planets`
  into each body's force before the velocity update. `physics.js` imports from
  `launchers.js` (one direction only — no cycle).
- Extend `test/launchers.test.js` and `test/physics.test.js`.

## Interface contracts

- **Exposes:** `planetForce`, `PLANET_G` (frozen, contracts/world-model.md + level-schema.md);
  `step` now honours `world.planets` (additive — worlds without planets behave exactly as in stage 2).
- **Consumes:** `step`/`createWorld` (stage 2), `src/launchers.js` (stage 3).

## Testing requirements

- `planetForce`: points toward the centre from each of 4 sides; magnitude follows inverse-square
  (at 2× distance → ¼ force); scales linearly with `body.mass` and `planet.mass`; inside the
  planet radius the magnitude is capped at the softened value (finite, no NaN at `d = 0`).
- `step` with a planet and zero uniform gravity: a body at rest 200 units right of the planet
  moves **toward** it (x decreases) and its acceleration is independent of body mass.
- **Slingshot:** a body flying past a planet ends with a deflected heading (its velocity
  angle changes toward the planet) vs. the same run with no planet.
- **Regression:** all stage-2 physics tests still pass unchanged (planet-free worlds identical).
- Determinism holds with planets present (two runs deep-equal).

## Acceptance conditions

- [ ] Kill-switch: **N/A — dark by construction.** No UI surface until stage 9 (see assessment).
- [ ] UI-smoke: N/A for this stage; covered by stage 9/10's UI-smoke (level with a planet).
- [ ] Additive migration only (no destructive schema change) — planet-free behaviour unchanged.
- [ ] Planet radial gravity is pure, unit-tested, and applied inside `step`
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
