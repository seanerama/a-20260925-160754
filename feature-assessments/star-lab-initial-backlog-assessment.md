# Feature assessment: Star Lab — initial backlog (Mode A)

- **Date:** 2026-09-25
- **Role:** Intake/Planner (`/verity:plan`, Mode A)
- **Request:** `spec.md` (fixture A) + committed `architecture.md` and ADR-0001..0004
- **Decision:** **ACCEPT — SPLIT into 10 dependency-ordered stages** covering every spec acceptance condition.

## 1. Claim / reality check (live codebase, commit `8e6d979`)

| Claim (spec / architecture) | Reality in repo | Consequence |
|---|---|---|
| Stack is decided: vanilla JS ES modules + Canvas 2D, `node --test`, zero deps (ADR-0001) | ADRs present; **no source yet** (no `package.json`, `src/`, `test/`, `index.html`) | Greenfield — stage 1 is the walking skeleton. |
| Module layout decided (`src/vec2.js … src/main.js`, `test/*.test.js`) | None exist | Each module has exactly one owning stage (below); no new modules invented except the test helper `test/simulate.js` and `docs/ui-smoke.md`. |
| "Hygiene CI green (the scaffolded pipeline)" | `.github/workflows/ci.yml` exists (gates / structure / gitleaks) | CI is scaffold infrastructure — **no stage touches `.github/`** (containment, issue #203). |
| Gates live in `.verity/gates.json` | Defined: `ls test/*.test.js && node --test test/*.test.js` | Gate is RED until tests exist → stage 1 must ship `test/vec2.test.js`; `npm test` uses the same glob. |
| CI `structure` job requires `README.md` + `LICENSE` | Both present (scaffold README) | Stages 1 and 10 **edit** README, never delete/replace scaffold sections. |
| Frozen contracts to respect | `verity contract list` → none | Seams are introduced here (see §3). |
| Existing stages | none | Numbering starts at 1. |
| Drop-in catalog | only `helper-bot` (In-App Help Agent) | Not adopted: it needs an LLM/network, contradicting ADR-0001 "no server, no network". |

No false premises found. Two gaps in the ADRs had to be pinned to make stages buildable in
isolation (recorded in contracts, not re-designing anything):

- **ADR-0004 "attempt ends at rest or a target hit"** vs. multi-target levels: generalised to
  *all targets hit*, plus a timeout so an orbiting ball cannot hang an attempt.
- **ADR-0004 "one efficiency metric per level (launches or fuel)"**: v1 fixes the metric to
  **launches** for every level (works for ramps, which have no power); additive extension
  remains possible.
- **Coordinates/units** (unstated): world units = canvas px, +y down, seconds; `FIXED_DT = 1/120`.
- **"Mass affects momentum and how planets pull"**: cannon power is an *impulse* (speed = power/mass),
  planet force ∝ body mass (so acceleration is physically mass-independent). Mass is therefore
  observable in play through the cannon.

## 2. Mode A sizing — why 10 stages, not a 3–5-stage thin slice

The planner default for Mode A is a thin first slice (ADR-0025), justified by re-planning later
slices via Mode B. `spec.md` §"Backlog requirement" states this is a **one-shot autonomous run
with NO recurring intake** — there will be no Mode B pass, so a thin slice would permanently
ship a game with no levels/UI and fail the spec. The premise of the thin-slice rule does not
hold here, so this plan delivers **full coverage** while keeping each stage small, skeleton-first
and dependency-ordered. The run budget is not at risk: 10 compact specs + 3 contracts.

## 3. Contracts introduced (frozen v1, additive-only)

| Contract | Seam | Producers → consumers |
|---|---|---|
| `contracts/world-model.md` | `Vec2/Body/Planet/Target/Rect/World`, `step`, `FIXED_DT`, `substeps`, `planetForce` math | stages 1,2,4,9 → all |
| `contracts/level-schema.md` | Level object (ADR-0003 made concrete), launcher math, `validateLevel/loadLevel/spawnBody` | stages 3,4,6 → 8,9,10 |
| `contracts/scoring.md` | collision + `attemptStatus`, `score → {solved, stars}`, badge store | stages 5,7 → 9,10 |

These are needed because stages 2–7 build in parallel-able isolation; without pinned shapes the
renderer/loop stages would integrate against guesses. No ADR is required — every contract is a
concretisation of an already-accepted ADR, not a new architectural decision.

## 4. Stage map & coverage

```
1 skeleton ─┬─ 2 physics ─┬─ 4 planet ─┐
            │             └─ 5 collision┼─ 6 levels ─ 8 renderer ─┐
            ├─ 3 cannon+ramp ─ (4) ─────┘                         ├─ 9 loop+Launch ─ 10 controls+README
            └─ 7 scoring ─────────────────────────────────────────┘
```

| Spec acceptance condition | Stage(s) |
|---|---|
| Deterministic fixed-timestep `step`, known trajectory | 2 (planet term 4) |
| Cannon / ramp / planet pure + unit-tested | 3, 4 |
| Bounce / target-hit / rest unit-tested | 5 |
| Declarative levels, ≥3 ship, invalid rejected | 6 |
| Pure scoring, 1–3 stars at boundaries, unsolved = no badge | 7 |
| `node --test` covers all of the above; zero deps | 1–7 (+9, 10) |
| UI-smoke: pick level, aim, Launch, hit, star badge | 9 (aim + Launch + badge), 10 (level select, all controls) |
| Renderer, accumulator loop, all on-screen controls | 8, 9, 10 |
| README (serve / play / test) | 1, 10 |
| Hygiene CI green | every stage (gate: `node --test test/*.test.js`) |

Parallelism: after stage 1, stages 2, 3 and 7 are independent; 5 needs only 2.
Same-file sequencing is enforced by dependencies: `launchers.js` (3 → 4), `physics.js`
(2 → 4 → 9), `main.js`/`index.html` (1 → 8 → 9 → 10), `levels.test.js` (6 → 10).

## 5. Kill-switch / dark-launch decision

The feature template pre-fills "kill-switch default OFF". For this project it is **N/A**, recorded
per stage:

- Stages 2–7 are pure, DOM-free modules nothing in the page imports until stage 9 — **dark by
  construction**; a flag would guard nothing.
- Stages 8–10 build the only user surface of an **unreleased static page** (no server, no users,
  no data beyond a new `localStorage` key). A default-OFF flag would hide the spec's own UI-smoke
  from the grader. Rollback = revert the PR.

## 6. Risks

- **Level tuning** (stage 6) is the likeliest place for a build to thrash; mitigated by the
  grid-search solvability test and the "level 3 unsolvable without the planet" check.
- **Rest detection flakiness** (balls micro-bouncing / sliding forever) — mitigated in the
  scoring contract by friction, a micro-bounce kill, and the `isSupported` requirement.
- **UI-smoke is manual** (no headless browser — zero-deps stance); stage 9's headless
  integration test drives the exact pure pipeline `main.js` uses to compensate.
