# Contract: level-schema

- **Status:** frozen v1
- **Owner:** Levels (`src/levels.js`) — stage 6. Launcher math (`src/launchers.js`) — stages 3–4.
- **Source of truth:** ADR-0003 (levels are declarative data) + `architecture.md` §Data model.
- **Consumers:** loader (stage 6), renderer (stage 8), game loop + controls (stages 9–10), tests.

## Exposes

### Launcher math — `src/launchers.js` (pure; stage 3, planet in stage 4)

| Export | Signature | Semantics |
|---|---|---|
| `cannonVelocity` | `({ angle, power }, mass = 1) → Vec2` | `power` is an **impulse**: `speed = power / mass`, direction `fromAngle(angle)` (0° right, 90° up). Heavier ball ⇒ slower shot. |
| `rampVelocity` | `({ incline, height, direction }, g) → Vec2` | frictionless energy conservation: `speed = sqrt(2 · g · height)`; leaves **along the slope, descending**: `{ x: direction·cos θ·speed, y: +sin θ·speed }` (θ = incline in degrees, +y down). `g` = gravity magnitude (> 0). |
| `planetForce` | `(planet, body) → Vec2` | see `contracts/world-model.md` §Planet force. |
| `PLANET_G` | `number` | planet gravitational constant. |

All three are pure: no mutation, no DOM, deterministic.

### Levels — `src/levels.js` (stage 6)

| Export | Signature | Semantics |
|---|---|---|
| `LEVELS` | `Level[]` | ≥ 3 levels, **increasing difficulty**, unique `id`s, every one passes `validateLevel`. |
| `validateLevel` | `(level) → string[]` | list of human-readable errors; `[]` ⇔ valid. Never throws. |
| `loadLevel` | `(level) → World` | throws `LevelError` (message = joined errors) if invalid; else builds a `World` (world-model contract). |
| `LevelError` | `class extends Error` | `name === 'LevelError'`, `.errors: string[]`. |
| `spawnBody` | `(launcher, { mass, gravity }) → Body` | builds the launched body for a `cannon`/`ramp` launcher: `pos` = launcher `pos`, `vel` from `cannonVelocity` / `rampVelocity` (ramp uses `length(gravity)`), `mass` as given, `radius: 12`, `kind: 'ball'`. Throws on `planet`. |

## Schema — the Level object (ADR-0003 shape, made concrete)

```js
Level = {
  id: string,                    // non-empty, unique across LEVELS
  name: string,                  // non-empty, shown in level select
  gravity: Vec2,                 // finite numbers; +y is down (e.g. { x: 0, y: 500 })
  launchers: Launcher[],         // ≥ 1 entry of type 'cannon' or 'ramp'
  targets: [{ pos: Vec2, radius: number /* > 0 */ }],   // ≥ 1
  obstacles: [{ rect: Rect }],   // may be empty; rect.w > 0, rect.h > 0
  starThresholds: { three: int, two: int },             // 1 ≤ three ≤ two
}

Launcher =
  | { type: 'cannon', pos: Vec2, angle: number /* deg, 0..90 */, power: number /* > 0 */ }
  | { type: 'ramp',   pos: Vec2 /* launch lip (bottom) */, incline: number /* deg, (0, 90) */,
                      height: number /* > 0 */, direction: 1 | -1 /* 1 = rolls right */ }
  | { type: 'planet', pos: Vec2, radius: number /* > 0 */, mass: number /* > 0 */ }
```

- `cannon.angle` / `cannon.power` are the **defaults** the controls start from; the player may
  change them (stage 10). `ramp` settings are fixed level geometry.
- `planet` "launchers" are not player-selectable: `loadLevel` places them in `world.planets`
  (the slingshot is always active).
- Validation MUST reject at least: missing/empty `id` or `name`; non-finite `gravity`;
  no cannon/ramp launcher; unknown launcher `type`; out-of-range launcher settings; no
  targets or a target with `radius ≤ 0`; obstacle rect with `w`/`h ≤ 0`; missing
  `starThresholds` or `three > two` or `three < 1`; any non-finite coordinate.

### `loadLevel(level) → World` mapping

```
gravity ← level.gravity
bodies  ← []                                        // nothing in flight until Launch
planets ← level.launchers.filter(type==='planet') → { pos, radius, mass }
targets ← level.targets → { pos, radius, hit: false }
walls   ← level.obstacles → rect
bounds  ← { x: 0, y: 0, w: 960, h: 540 }
```

All objects are copied — mutating the returned world never alters `LEVELS`.

## Consumes

`contracts/world-model.md` (`World`, `Body`, `Vec2`, `createWorld`, `createBody`, `vec2.js`).

## Versioning

Frozen at **v1**. Changes are **additive only** — a breaking change is a NEW
contract, not an edit (framework-spec §4.3). Every consumer depends on this shape.
