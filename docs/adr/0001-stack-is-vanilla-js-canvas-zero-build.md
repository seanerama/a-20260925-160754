# 0001. Stack is vanilla JS + Canvas, zero build step

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

Star Lab is an interactive physics game meant to be **played and graded by a human**, and it
is also a benchmark fixture that must be deterministic, dependency-light, and testable with
zero external services. Options ranged from a framework + bundler (React/Vite) to a game
engine (Phaser) to plain browser APIs.

## Decision

Build with **modern vanilla JavaScript (ES modules) and the HTML5 Canvas 2D context — no
framework, no bundler, no build step.** The game is a set of static files served over http.
The pure logic modules are DOM-free so **Node's built-in test runner (`node --test`)** drives
them directly; `package.json` is `"type": "module"` with **no runtime or dev dependencies**.
Star badges persist in `localStorage`.

## Consequences

- A human grader opens the game with only a static server (`python3 -m http.server` /
  `npx serve`) — no toolchain, no install. The same ES modules run unchanged in the browser
  and under `node --test`.
- Zero dependencies means nothing to pin, audit, or break a fixture run; variance comes from
  the model, not a flaky lockfile. The cost is doing sprite-free cartoon drawing by hand on
  the canvas and writing the physics ourselves (see ADR-0002) — acceptable and, for this
  fixture, the point.
