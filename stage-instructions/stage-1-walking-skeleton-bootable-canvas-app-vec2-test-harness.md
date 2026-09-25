# Stage 1: Walking skeleton: bootable canvas app + vec2 + test harness

- **Type:** chore
- **Depends on:** none

## Objectives

Stand up the zero-build skeleton every later stage plugs into (ADR-0001): a static page that
boots a `<canvas>` via an ES-module `src/main.js`, a `package.json` with a `node --test`
script and **zero dependencies**, and the first pure module (`src/vec2.js`) with tests — so
the committed gate in `.verity/gates.json` (`node --test test/*.test.js`) turns green.

## What to build

- `package.json` — `{ "name": "star-lab", "private": true, "type": "module",
  "scripts": { "test": "node --test test/*.test.js" } }` — the same command as the gate
  (Node's directory-argument behaviour differs across versions, so use the explicit glob).
  **No `dependencies` / `devDependencies` keys.**
- `index.html` — `<!doctype html>`, title "Star Lab", one
  `<canvas id="stage" width="960" height="540">`, an empty `<div id="controls">` panel placeholder
  beside/below it, minimal inline CSS (friendly, kid-oriented colours), and
  `<script type="module" src="src/main.js"></script>`. No external CDN/font/script URLs.
- `src/main.js` — gets the canvas 2D context and draws a placeholder scene: sky background,
  a ground strip, and the text "Star Lab — loading experiments…". Must not throw if run in a
  browser; it is NOT imported by tests (it touches the DOM).
- `src/vec2.js` — every export in `contracts/world-model.md` §`src/vec2.js`
  (`vec2, add, sub, scale, dot, length, distance, normalize, fromAngle`). Pure, never mutates.
- `test/vec2.test.js` — `node:test` + `node:assert/strict`.
- `README.md` — **edit the existing file (do not delete the scaffold sections)**: add
  "Play" (`python3 -m http.server 8000` then open `http://localhost:8000/`) and
  "Test" (`npm test`) sections.

Do **not** touch `.github/` (containment-protected; CI is scaffold-provided) or `.verity/`.

## Interface contracts

- **Exposes:** `src/vec2.js` (contracts/world-model.md), the page shell (`#stage` canvas
  960×540, `#controls` container) that stages 8–10 fill.
- **Consumes:** `contracts/world-model.md` (vec2 section).

## Testing requirements

- `test/vec2.test.js`: each helper, including `normalize({0,0})` → `{0,0}` (no NaN),
  `fromAngle(0, 2)` ≈ `{2, 0}`, `fromAngle(90, 1)` ≈ `{0, -1}` (screen-up is −y),
  and a no-mutation check on inputs.
- UI-smoke (manual, record in PR description): serve the folder, open `index.html`, the
  placeholder scene draws and the browser console shows no errors.

## Acceptance conditions

- [ ] Exit-state: `node --test test/*.test.js` passes locally and `node .verity/run-gates.cjs` exits 0
- [ ] `package.json` has `"type": "module"` and no dependency keys
- [ ] Serving the repo root over http and opening `index.html` shows the placeholder canvas with no console errors
- [ ] README has Play + Test instructions; scaffold sections preserved
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
