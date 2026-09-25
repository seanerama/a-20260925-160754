# Contract: world-model

- **Status:** frozen v1
- **Owner:** Physics core (`src/vec2.js`, `src/physics.js`) — stages 1–2; planet force added by stage 4.
- **Source of truth:** `architecture.md` §Data model + ADR-0002 (fixed-timestep semi-implicit Euler).

## Exposes

### `src/vec2.js` (stage 1) — plain-object 2-D vectors, **never mutate inputs**

| Export | Signature | Notes |
|---|---|---|
| `vec2` | `(x = 0, y = 0) → Vec2` | constructor |
| `add` | `(a, b) → Vec2` | |
| `sub` | `(a, b) → Vec2` | `a - b` |
| `scale` | `(v, s) → Vec2` | |
| `dot` | `(a, b) → number` | |
| `length` | `(v) → number` | |
| `distance` | `(a, b) → number` | |
| `normalize` | `(v) → Vec2` | zero vector → `{x: 0, y: 0}` (never `NaN`) |
| `fromAngle` | `(degrees, magnitude = 1) → Vec2` | **screen convention**: 0° = +x (right), 90° = straight **up** ⇒ `{ x: m·cos θ, y: −m·sin θ }` |

### `src/physics.js` (stage 2; planet term added in stage 4)

| Export | Signature | Notes |
|---|---|---|
| `FIXED_DT` | `number` = `1 / 120` (seconds) | the ONE timestep the game loop and tests use |
| `WORLD_WIDTH`, `WORLD_HEIGHT` | `960`, `540` | play-field size in world units |
| `createWorld` | `(partial = {}) → World` | fills defaults (below); copies arrays |
| `createBody` | `(partial = {}) → Body` | defaults `mass: 1, radius: 12, kind: 'ball', vel: {0,0}` |
| `step` | `(world, dt) → World` | **pure**: returns a NEW world; input is never mutated |
| `MAX_FRAME_SECONDS` | `0.25` | cap on one frame's real delta (tab-switch spiral-of-death guard) |
| `substeps` | `(accumulator, frameSeconds, dt = FIXED_DT) → { steps: int, accumulator: number }` | the accumulator rule (ADR-0002): `acc = accumulator + min(frameSeconds, MAX_FRAME_SECONDS)`; `steps = floor(acc / dt)`; returns the remainder `acc − steps·dt`. Pure. Added by stage 9. |

**`step` semantics (semi-implicit Euler, ADR-0002)** — for every body, in array order:
1. `force = scale(world.gravity, body.mass) + Σ planetForce(planet, body)` over `world.planets`
   (planet term arrives in stage 4; until then `world.planets` contributes nothing).
2. `vel' = vel + scale(force, dt / body.mass)`
3. `pos' = pos + scale(vel', dt)` ← uses the **updated** velocity (that is what makes it semi-implicit)

Nothing else happens in `step`: **no collision, no target marking** — that is
`collision.resolveCollisions` (contract below, stage 5). Same input world + same
`dt` ⇒ bit-identical output (no `Math.random`, no `Date.now`).

## Schema

Coordinates are **world units = canvas CSS pixels**, origin **top-left**, **+y points DOWN**
(canvas-native). Time is in **seconds**. So "normal" gravity is `{ x: 0, y: +g }`.

```js
Vec2   = { x: number, y: number }
Body   = { pos: Vec2, vel: Vec2, mass: number /* >0 */, radius: number /* >0 */, kind: string }
Planet = { pos: Vec2, radius: number /* >0, drawn size + softening floor */, mass: number /* >0 */ }
Target = { pos: Vec2, radius: number /* >0 */, hit: boolean }
Rect   = { x: number, y: number, w: number /* >0 */, h: number /* >0 */ }   // top-left origin
World  = {
  gravity: Vec2,          // default { x: 0, y: 500 }
  bodies:  Body[],        // default []
  planets: Planet[],      // default []
  targets: Target[],      // default []
  walls:   Rect[],        // solid obstacles the body bounces off; default []
  bounds:  Rect,          // play-field edges; default { x: 0, y: 0, w: 960, h: 540 }
}
```

### Planet force (`src/launchers.js`, stage 4) — consumed by `step`

`planetForce(planet, body) → Vec2` — Newtonian attraction toward the planet centre:

```
d      = planet.pos − body.pos
r²     = max(|d|², planet.radius²)          // softening: no singularity inside the planet
|F|    = PLANET_G · planet.mass · body.mass / r²
F      = normalize(d) · |F|                 // points FROM body TOWARD planet centre
```

`PLANET_G` is an exported constant of `src/launchers.js` (value chosen by stage 4 so that
a level-sized planet visibly bends a cannon shot; documented in a comment).
Because `step` divides by `body.mass`, **acceleration is mass-independent (real physics)** —
mass matters to gameplay through the cannon impulse (see level-schema / launchers).

## Consumes

Nothing (leaf module set). `physics.js` may import `vec2.js` and (from stage 4) `planetForce`
from `launchers.js`; `launchers.js` must **not** import `physics.js` (no cycle).

## Versioning

Frozen at **v1**. Changes are **additive only** — a breaking change is a NEW
contract, not an edit (framework-spec §4.3). Every consumer depends on this shape.
