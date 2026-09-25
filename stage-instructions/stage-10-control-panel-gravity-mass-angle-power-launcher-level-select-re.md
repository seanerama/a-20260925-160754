# Stage 10: Control panel: gravity, mass, angle, power, launcher, level select + README

- **Type:** feature
- **Depends on:** 9

## Objectives

Complete the experiment panel the spec requires — **gravity, mass, launch angle, power,
launcher choice, level select, Launch / Reset** — show earned star badges per level, and
finish the README so a grader can serve, play, and test with no toolchain. After this stage
every spec acceptance condition is met.

## What to build

- `index.html` — extend `#controls` (keep stage 9's Angle / Power / Launch / Reset):
  - **Level select** — a `<select>` (or button row) listing every `LEVELS` entry by name, each
    showing its best earned stars (e.g. "Ramp Run ★★☆") from `loadBadges(localStorage)`.
  - **Launcher choice** — radio buttons generated from the current level's cannon/ramp
    launchers (planets are not selectable). Angle/Power sliders are disabled (greyed, with a
    hint) when a ramp is selected — the ramp's geometry is fixed.
  - **Gravity** slider — 100–1000 in steps of 50 (world units/s², downward), initialised
    from the level's `gravity.y` on level load, with a "Moon / Earth / Jupiter"-style friendly
    label; a "level default" reset link.
  - **Mass** slider — 0.5–3 in steps of 0.25; label explains "heavier = slower cannon shot".
- `src/main.js`:
  - Changing **level** ⇒ `loadLevel` the new level, reset `launches = 0`, reset controls to the
    level's defaults, clear result/attempt.
  - **Launcher choice** ⇒ `view.launcherIndex` highlights it; Launch spawns from it.
  - **Gravity** ⇒ applied to the world (`gravity: { x: level.gravity.x, y: slider }`) at the
    next Launch/Reset (not mid-flight — keeps an attempt deterministic); `spawnBody` receives
    that gravity (ramp speed depends on it).
  - **Mass** ⇒ passed to `spawnBody` (affects cannon speed via impulse; planet pull on the
    ball is mass-independent in acceleration — correct physics).
  - After a solve, refresh the level-select star labels.
  - Changing a control mid-attempt must not throw; either ignore until the attempt ends or apply
    on next Launch (document which).
- `README.md` — finalize (keep scaffold sections): what Star Lab is; **Play**
  (`python3 -m http.server 8000` or `npx serve`, open `http://localhost:8000/`); **How to play**
  (each control, how stars are earned: fewer launches = more stars, thresholds per level);
  **Levels** (the three, one line each); **Test** (`npm test`, zero dependencies); **Project
  layout** (the module list from `architecture.md`).
- `docs/ui-smoke.md` — extend with steps for level select, launcher choice (ramp on level 2),
  gravity & mass sliders visibly changing a shot, and the planet slingshot on level 3.

## Interface contracts

- **Exposes:** the complete game UI.
- **Consumes:** everything from stages 1–9 via their frozen contracts
  (world-model, level-schema, scoring) and `render`'s `view` shape. No contract changes.

## Testing requirements

- `test/levels.test.js` (additive): for level 2, the **ramp** launcher alone reaches
  `'all-hit'` at the level's default gravity (the path the UI-smoke uses); for level 3 the
  documented solving cannon settings reach `'all-hit'` (reuse `test/simulate.js`).
- `test/launchers.test.js` (additive): mass slider bounds — `cannonVelocity` at mass 0.5 is
  2× the speed at mass 1 and at mass 3 is ⅓.
- **UI-smoke** (run `docs/ui-smoke.md` end-to-end and paste the result in the PR): all three
  levels selectable; level 1 solved → star badge + stars shown in level select after reload;
  level 2 solved with the ramp; level 3 solved via the planet; gravity and mass sliders
  observably change the trajectory; Reset clears the shot; no console errors.

## Acceptance conditions

- [ ] Kill-switch: **N/A** — completes the product's primary surface on an unreleased static page (see assessment).
- [ ] UI-smoke "observably-works": `docs/ui-smoke.md` covers every control and all three levels, and was executed
- [ ] Additive migration only — reads/writes only `starlab.badges.v1` via `loadBadges`/`saveBadge`
- [ ] On-screen controls for gravity, mass, angle, power, launcher choice, level select, Launch and Reset all work
- [ ] README explains serve / play / test; `package.json` still has zero dependencies
- [ ] Existing suite stays green; CI all-green

## Pipeline test: NO
