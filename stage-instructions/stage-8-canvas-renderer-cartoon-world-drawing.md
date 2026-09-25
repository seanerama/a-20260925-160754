# Stage 8: Canvas renderer: cartoon world drawing

- **Type:** feature
- **Depends on:** 6

## Objectives

Draw a level so a kid can see the puzzle (architecture §Renderer): a Canvas 2D renderer that
paints the world — sky, ground, obstacles, planets, targets (hit/un-hit), launchers, and any
flying body — in a friendly hand-drawn cartoon style. The page now shows level 1 instead of the
placeholder.

## What to build

- `src/render.js` — DOM-free at import time (it receives a context; never queries `document`):
  - `render(ctx, world, level, view = {})` — clears and draws, in order: sky gradient,
    ground strip along `bounds` bottom, obstacles (`world.walls`, cartoon blocks with outline),
    planets (`world.planets`, round with a soft gravity halo ring), targets (bullseye / star
    shape; visibly different once `hit`), launchers from `level.launchers` (cannon barrel
    rotated to `view.angle ?? launcher.angle`; ramp as a filled triangle rising from the lip
    `pos` back up to `height`; the **selected** launcher `view.launcherIndex` highlighted),
    then bodies (`world.bodies`, round cartoon ball with face/shine) and an optional
    aim-preview dotted line when `view.aimPreview` is provided (array of Vec2).
  - `drawBadge(ctx, { solved, stars }, levelName)` — centered overlay: 1–3 filled stars +
    "Solved!" or a "Try again!" message when unsolved.
  - Only Canvas 2D API calls; no images/fonts from the network.
- `src/main.js` — replace the placeholder: `loadLevel(LEVELS[0])` and `render` it once
  (static — the loop arrives in stage 9).
- `test/render.test.js` — a **recording fake context** (an object whose methods push
  `[name, args]` into a log and whose settable props are plain fields) proving `render`
  runs without throwing for every level in `LEVELS`, draws each target/planet/wall
  (e.g. at least one `arc` centred on every target and planet, a `fillRect`/`rect` at every
  wall's coordinates), and `drawBadge` draws `stars` filled stars (assert via a count the
  implementation makes observable, e.g. one `fill` per star path — document the choice).

## Interface contracts

- **Exposes:** `render(ctx, world, level, view)`, `drawBadge(ctx, result, levelName)` — used by
  stages 9–10. `view` = `{ launcherIndex?, angle?, aimPreview? }` (additive: unknown keys ignored).
- **Consumes:** `World` (contracts/world-model.md), `Level` (contracts/level-schema.md),
  `{ solved, stars }` (contracts/scoring.md), `LEVELS`/`loadLevel` (stage 6).

## Testing requirements

- Fake-context tests above (no DOM, no canvas package — **zero dependencies**).
- UI-smoke (manual, record in PR): serve and open `index.html`; level 1 draws with sky,
  ground, cannon, and target; no console errors.

## Acceptance conditions

- [ ] Kill-switch: **N/A** — the renderer only replaces the stage-1 placeholder drawing on a not-yet-released static page (no users, no server; see assessment).
- [ ] UI-smoke "observably-works": level 1 renders in the browser (steps above in the PR description)
- [ ] Additive migration only (no destructive schema change) — no persisted data touched.
- [ ] `render` / `drawBadge` exercised against every shipped level via the fake context
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
