# 0003. Levels are declarative data; the engine is data-driven

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

Star Lab is a puzzle game: each puzzle places some launchers, targets, obstacles, a gravity
setting, and the thresholds for earning stars. Puzzles could be hard-coded as bespoke setup
functions per level, or expressed as plain data the engine interprets.

## Decision

Represent every puzzle as a **declarative level object** and make the engine **data-driven**:

```
{ id, name, gravity: {x, y}, launchers: [ {type, ...settings} ],
  targets: [ {pos, radius} ], obstacles: [ {rect} ],
  starThresholds: { three, two } }
```

A single `loadLevel(level)` **validates** the object (known launcher types, well-formed
targets, sane thresholds) and builds a `World` from it. Adding or tuning a puzzle is a data
change — no engine change. The level list is ordinary data the loader consumes.

## Consequences

- New puzzles cost only data, and a malformed level is **rejected by the loader** (a unit
  test asserts both a valid level loads and an invalid one is refused) rather than crashing
  mid-play. Content is cleanly separated from the physics engine.
- The declarative shape is the contract between level content, the loader, and the renderer;
  every level must conform to it. Extending the schema (a new launcher type, a moving target)
  means extending the loader's validation in one place.
