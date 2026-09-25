# Contract: scoring

- **Status:** frozen v1
- **Owner:** Scoring (`src/scoring.js`) — stage 7. Attempt status (`src/collision.js`) — stage 5.
- **Source of truth:** ADR-0004 (star-badge scoring contract).
- **Consumers:** game loop + controls (stages 9–10), renderer badge overlay, tests.

## Exposes

### Collision + attempt status — `src/collision.js` (stage 5, all pure)

| Export | Signature | Semantics |
|---|---|---|
| `RESTITUTION` | `number` = `0.6` | default bounce coefficient |
| `FRICTION` | `number` = `0.98` | tangential-velocity multiplier applied on **every** contact (so a ball rolling on the ground slows and stops) |
| `REST_SPEED` | `number` = `5` | world units / s; below this a supported body is "at rest" |
| `MAX_ATTEMPT_SECONDS` | `number` = `15` | safety timeout for one attempt (e.g. a ball orbiting a planet) |
| `bounceOffBounds` | `(body, bounds, restitution = RESTITUTION) → Body` | body kept inside the **left, right and bottom** edges of `bounds` (bottom = the ground). The **top edge is open**: a body may fly above the screen and fall back. On penetration: position clamped to the edge, normal velocity reflected × `restitution`, tangential velocity × `FRICTION`; if the reflected normal speed is `< REST_SPEED` it is set to `0` (kills endless micro-bounce). |
| `bounceOffRect` | `(body, rect, restitution = RESTITUTION) → Body` | body kept **outside** a solid rect (circle-vs-AABB, closest-point normal), same reflect / friction / micro-bounce rule. |
| `isTargetHit` | `(body, target) → boolean` | circle overlap: `distance(body.pos, target.pos) ≤ body.radius + target.radius`. |
| `isAtRest` | `(body, epsilon = REST_SPEED) → boolean` | `length(body.vel) < epsilon`. |
| `isSupported` | `(body, world) → boolean` | body's bottom is within 1 unit of the ground (`bounds` bottom) or of the top face of a wall it horizontally overlaps. |
| `resolveCollisions` | `(world, restitution = RESTITUTION) → World` | pure: for every body apply `bounceOffRect` for each wall, then `bounceOffBounds`; then mark every overlapped target `hit: true` (a hit target stays hit). |
| `attemptStatus` | `(world, elapsedSeconds) → 'running' \| 'all-hit' \| 'rest' \| 'timeout'` | precedence: `all-hit` (every target hit) › `rest` (every body `isAtRest` **and** `isSupported` — so the apex of a vertical shot is NOT rest) › `timeout` (`elapsedSeconds ≥ MAX_ATTEMPT_SECONDS`) › `running`. With zero bodies it never returns `rest` (the game loop only asks after a Launch). |

An attempt ENDS when `attemptStatus` returns anything but `'running'` (ADR-0004: "an attempt
ends at rest detection or a target hit" — generalised to *all* targets hit so multi-target
levels are solvable, plus `timeout` so an attempt can never hang).

### Scoring — `src/scoring.js` (stage 7)

| Export | Signature | Semantics |
|---|---|---|
| `score` | `({ targetsHit, targetsTotal, launches }, starThresholds) → { solved, stars }` | **pure** — see rules below. |
| `BADGE_STORAGE_KEY` | `'starlab.badges.v1'` | |
| `loadBadges` | `(storage) → { [levelId]: 1\|2\|3 }` | `storage` is any `{ getItem, setItem }` (`localStorage` in the browser, a fake in tests). Missing/corrupt JSON ⇒ `{}` (never throws). |
| `saveBadge` | `(storage, levelId, stars) → { [levelId]: stars }` | stores the **best** star count per level (never lowers it); `stars === 0` stores nothing. Returns the updated map. |

### `score` rules (ADR-0004)

- **Efficiency metric (v1): `launches`** — the number of Launch presses on this level since it
  was (re)loaded, *including* the solving one. Lower is better. (One metric for every level;
  a future metric must fold into the same return shape — additive.)
- `solved = targetsTotal > 0 && targetsHit === targetsTotal`
- `stars = !solved ? 0 : launches ≤ three ? 3 : launches ≤ two ? 2 : 1`
- Returns exactly `{ solved: boolean, stars: 0 | 1 | 2 | 3 }`; `stars === 0` **iff** unsolved.

Persistence is **downstream** of `score`: the UI calls `score`, then `saveBadge` with the result.

## Consumes

`contracts/world-model.md` (`World`, `Body`, `Target`, `Rect`, `vec2.js`),
`contracts/level-schema.md` (`starThresholds`).

## Versioning

Frozen at **v1**. Changes are **additive only** — a breaking change is a NEW
contract, not an edit (framework-spec §4.3). Every consumer depends on this shape.
