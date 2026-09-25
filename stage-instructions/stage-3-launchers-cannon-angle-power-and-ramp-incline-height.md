# Stage 3: Launchers: cannon (angle+power) and ramp (incline+height)

- **Type:** feature
- **Depends on:** 1

## Objectives

Two of the three ways to set an object in motion, as pure functions from launcher settings to
an initial velocity (architecture §Launchers). Mass matters: the cannon's power is an impulse.

## What to build

- `src/launchers.js` — `cannonVelocity` and `rampVelocity` exactly per
  `contracts/level-schema.md` §Launcher math:
  - `cannonVelocity({ angle, power }, mass = 1)` → `fromAngle(angle, power / mass)`.
  - `rampVelocity({ incline, height, direction }, g)` → speed `sqrt(2·g·height)`, direction
    `{ x: direction·cos θ, y: +sin θ }` (descending along the slope; +y is down).
  - Pure, DOM-free; imports only `src/vec2.js`. **Must not import `src/physics.js`.**
  - Leave room for stage 4 to add `planetForce` + `PLANET_G` in this same file.
- `test/launchers.test.js`.

## Interface contracts

- **Exposes:** `cannonVelocity`, `rampVelocity` (contracts/level-schema.md — frozen v1).
- **Consumes:** `src/vec2.js` (contracts/world-model.md).

## Testing requirements

- Cannon: angle 0 → purely +x; angle 90 → purely −y (up); angle 45, power 100, mass 1 →
  `{≈70.71, ≈−70.71}`; doubling mass halves speed; speed == power/mass for several angles.
- Ramp: incline 30, height 80, g 500, direction 1 → speed `sqrt(2·500·80)` = 282.84…,
  `x > 0`, `y > 0` (descending), angle of the vector == 30°; `direction: -1` mirrors `x`;
  higher ramp → faster; speed independent of incline.
- Purity: inputs unchanged.

## Acceptance conditions

- [ ] Kill-switch: **N/A — dark by construction.** Pure module, not reachable from the UI until stage 9 (see assessment).
- [ ] UI-smoke: N/A for this stage (no user-facing surface); covered by stage 9/10's UI-smoke.
- [ ] Additive migration only (no destructive schema change) — no persisted data touched.
- [ ] Cannon and ramp are pure and unit-tested as above
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
