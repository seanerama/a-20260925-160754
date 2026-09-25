# 0004. Star-badge scoring contract

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

Solving a puzzle earns a **star badge**, and the game rewards *elegant* solutions with more
stars. The renderer (to show the badge), the controls (to end an attempt), and the tests all
need one predictable notion of "solved" and "how many stars" rather than ad-hoc logic
scattered across the UI.

## Decision

Scoring is a **single pure function** with a stable shape:

- **Solve** = **every target hit within one attempt** (an attempt ends at rest detection or a
  target hit — see the collision component). No target missed ⇒ not solved.
- **Stars (1–3)** follow the level's `starThresholds` measured by an **efficiency metric**
  (launches used, or fuel/power spent — one metric, defined per level): at or under
  `three` ⇒ 3 stars, at or under `two` ⇒ 2 stars, otherwise **1 star for solving at all**.
- The function returns `{ solved: boolean, stars: 0 | 1 | 2 | 3 }` — `0` stars iff unsolved.

The UI calls this function to award and render the badge; persistence (`localStorage`) stores
the best star count per level id but is **separate** from — and downstream of — the pure
scoring logic.

## Consequences

- One shape to test and to render: unit tests pin the boundaries (unsolved ⇒ 0; solved just
  over/under each threshold ⇒ the right star count), and the UI never re-implements scoring.
- Every level must supply `starThresholds`, and any new efficiency dimension must fold into
  the same `{ solved, stars }` return so the UI and tests stay in lockstep.
