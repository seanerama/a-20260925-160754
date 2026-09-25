# Repo A — Star Lab, a physics playground game (benchmark fixture)

**Role in the benchmark:** the **heavy** greenfield fixture. Build **Star Lab** — a playful
science game where kids run experiments with gravity, mass, and motion by launching cartoon
objects from **ramps, planets, and cannons** to solve physics puzzles and collect **star
badges** — **per the committed architecture and ADRs** already in this repo. Read
`architecture.md` and `docs/adr/0001..0004` and decompose the build from them. The
architecture is **decided** (stack, physics model, module layout, level format, scoring
contract); this is an execution ask, not a design exercise. Sized to decompose into a heavy
(~10–12 stage) build — the intended heaviest fixture, read against the tiny control app
(Repo D). Deliberately **human-playable** so a grader can open it and judge the result.

## Backlog requirement (read first, planner)

This is a **one-shot autonomous run with NO recurring intake**: the initial backlog you cut
here is the **only** backlog this project will ever get — there is no later request stream to
pick up what you defer. So "thin walking skeleton first" does NOT mean "park the rest":
decompose until the stages, **taken together, deliver every acceptance condition below** —
levels, scoring/star badges, renderer, game loop and on-screen controls included. Keep the
stages small and dependency-ordered as usual; it is the **coverage** that must be complete,
not the stage size. A backlog that ends at a physics core with no playable game is an
incomplete plan for this request.

## What to build

A zero-build browser game, exactly as `architecture.md` lays out (vanilla JS ES modules +
HTML5 Canvas 2D, no framework, no bundler, no runtime dependencies):

- **Physics core** — a `World` of bodies and a pure `step(world, dt)` that applies gravity
  and integrates motion at a **fixed timestep** (semi-implicit Euler), so the simulation is
  deterministic ([ADR-0002](docs/adr/0002-physics-is-a-fixed-timestep-integrator.md)). Mass
  affects momentum and how planets pull an object.
- **Launchers** — three ways to set an object in motion, each a pure function:
  - **Cannon** — aim **angle** + **power** → an initial velocity vector.
  - **Ramp** — an incline the object rolls down; slope + height → launch direction and speed.
  - **Planet** — a body with **radial gravity** that pulls nearby objects toward its center
    (slingshot around it), applied as a force during `step`.
- **Collision** — wall/ground **bounce** with restitution, **target-hit** detection (circle
  overlap), and **rest** detection (speed below epsilon ends the attempt).
- **Levels** — each puzzle is a **declarative level object** (gravity, the launchers on
  offer, targets, obstacles, star thresholds); a `loadLevel` validates it and builds a
  `World` ([ADR-0003](docs/adr/0003-levels-are-declarative-data.md)). Ship at least **three**
  playable levels of increasing difficulty.
- **Scoring / star badges** — a pure function: **solve** = every target hit in one attempt;
  award **1–3 stars** by the level's efficiency thresholds
  ([ADR-0004](docs/adr/0004-star-badge-scoring-contract.md)). Earned badges persist in
  `localStorage`.
- **Renderer, game loop & controls** — a Canvas 2D renderer; an accumulator game loop that
  advances the fixed-step physics; on-screen controls for gravity, mass, launch angle,
  power, launcher choice, level select, and **Launch / Reset**.
- **Module layout** — `index.html`, `src/vec2.js`, `src/physics.js`, `src/launchers.js`,
  `src/collision.js`, `src/levels.js`, `src/scoring.js`, `src/render.js`, `src/main.js`,
  `test/*.test.js`, `package.json` (`"type": "module"`), `README.md` (as in `architecture.md`).

## Acceptance conditions (what the built game must satisfy)

- [ ] `step(world, dt)` integrates gravity at a fixed timestep and is **deterministic**: the
      same world + N steps yields the same positions (unit-tested against a known trajectory).
- [ ] Each launcher is a pure function producing the right initial motion: **cannon**
      (angle + power → velocity), **ramp** (incline + height → direction & speed), **planet**
      (radial gravity pulling a nearby body toward its center) — each unit-tested.
- [ ] Collision works: a body **bounces** off walls/ground with restitution, a **target-hit**
      is detected on circle overlap, and **rest** is detected below the speed epsilon — each
      unit-tested.
- [ ] Levels are declarative data loaded by `loadLevel`; at least **three** levels ship and
      an invalid level is rejected by the loader (unit-tested).
- [ ] Scoring is a pure function: solving all targets awards a badge, and **1–3 stars** follow
      the per-level thresholds; unsolved = no badge (unit-tested at the boundaries).
- [ ] `node --test` covers the physics core, all three launchers, collision, the level loader,
      and scoring; **zero dependencies** in `package.json`.
- [ ] **UI-smoke:** serve the folder over http (e.g. `python3 -m http.server` or `npx serve`)
      and open `index.html` → pick a level, aim a launcher, press **Launch**, hit the target,
      and see a **star badge** awarded. No build step required.
- [ ] Hygiene CI green (the scaffolded pipeline).

## Notes for the harness

- This spec is the request-issue body the harness feeds `verity plan` (Mode A) after
  scaffolding the fixture repo **with the committed `architecture.md` + `docs/adr/*` seed
  set** (stage 58 `seed_dir`). The plan role decomposes the committed architecture, not a
  bare request. It is deliberately the heaviest fixture — ~10–12 small stages (physics core,
  cannon, ramp, planet, collision/bounce, target-hit + rest, levels + loader, scoring/star
  badges, renderer, game loop + controls, tests/README) — enough to exercise a full
  autonomous build→review loop under load, and **playable** so a human can grade quality.
- Deterministic and dependency-light on purpose (vanilla JS + Canvas + `node --test`, zero
  deps): a run's variance should come from the model, not a flaky fixture. The fixed-timestep
  physics core keeps the tested behavior reproducible.
