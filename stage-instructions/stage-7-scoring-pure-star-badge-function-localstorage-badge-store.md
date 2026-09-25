# Stage 7: Scoring: pure star-badge function + localStorage badge store

- **Type:** feature
- **Depends on:** 1

## Objectives

One predictable notion of "solved" and "how many stars" (ADR-0004): a pure `score` function
returning `{ solved, stars }`, plus a separate, downstream badge store that persists the best
star count per level in `localStorage`.

## What to build

- `src/scoring.js` — exactly the exports in `contracts/scoring.md` §Scoring:
  `score`, `BADGE_STORAGE_KEY`, `loadBadges`, `saveBadge`.
  - `score({ targetsHit, targetsTotal, launches }, { three, two })` per the contract rules
    (metric v1 = launches; lower is better).
  - `loadBadges(storage)` / `saveBadge(storage, levelId, stars)` take an injected
    `{ getItem, setItem }` — **never reference the global `localStorage` inside this module**
    (keeps it DOM-free and testable). Corrupt/missing JSON ⇒ `{}`; best-only; `0` stars not stored.
- `test/scoring.test.js` (use an in-memory fake storage object).

## Interface contracts

- **Exposes:** `score`, `loadBadges`, `saveBadge`, `BADGE_STORAGE_KEY` (contracts/scoring.md — frozen v1).
- **Consumes:** `starThresholds` shape (contracts/level-schema.md). No other module.

## Testing requirements

Boundary table with thresholds `{ three: 2, two: 4 }`:

| targetsHit/total | launches | expected |
|---|---|---|
| 0/1 | 1 | `{ solved: false, stars: 0 }` |
| 1/2 | 1 | `{ solved: false, stars: 0 }` |
| 0/0 | 1 | `{ solved: false, stars: 0 }` (no targets ⇒ never solved) |
| 2/2 | 1 | 3 |
| 2/2 | 2 | 3 (at threshold) |
| 2/2 | 3 | 2 (just over `three`) |
| 2/2 | 4 | 2 (at `two`) |
| 2/2 | 5 | 1 (just over `two`) |
| 2/2 | 50 | 1 |

Plus: return object has exactly the keys `solved`, `stars`; `stars === 0` iff `!solved`.
Badge store: empty storage ⇒ `{}`; corrupt JSON ⇒ `{}`; save 2 then 3 ⇒ 3; save 3 then 1 ⇒
stays 3; save 0 ⇒ nothing stored; multiple level ids coexist; data lives under `BADGE_STORAGE_KEY`.

## Acceptance conditions

- [ ] Kill-switch: **N/A — dark by construction.** Pure module; no UI surface until stage 9 (see assessment).
- [ ] UI-smoke: N/A for this stage; stage 9/10's UI-smoke sees the badge awarded.
- [ ] Additive migration only — new `localStorage` key `starlab.badges.v1`; a malformed stored value is tolerated, never crashes.
- [ ] Scoring is pure and unit-tested at every threshold boundary; unsolved ⇒ no badge
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
