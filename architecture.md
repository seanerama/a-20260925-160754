# Architecture — Star Lab, a physics playground game

**Role in the benchmark:** the committed, decided architecture fixture A reads from
(Mode A / seed_dir). This is **already decided** — the plan role decomposes it into
stages, it does not re-design it. Terse but real; the decisions live in `docs/adr/`.

Star Lab is a **playful science game**: kids run experiments with gravity, mass, and
motion by launching cartoon objects from **ramps, planets, and cannons** to solve physics
puzzles and collect **star badges**. It runs in the browser with **no build step** so a
human grader can open it and actually play.

## Stack (decided)

- **Language/runtime:** modern **vanilla JavaScript** (ES modules) — no framework, no
  bundler, **no build step**. See [ADR-0001](docs/adr/0001-stack-is-vanilla-js-canvas-zero-build.md).
- **Rendering:** the **HTML5 Canvas 2D** context. One `<canvas>`, hand-drawn cartoon shapes.
- **Physics:** a **hand-written fixed-timestep integrator** (semi-implicit Euler) — no
  physics library. See [ADR-0002](docs/adr/0002-physics-is-a-fixed-timestep-integrator.md).
- **Tests:** Node's built-in test runner (`node --test`) over the pure, DOM-free logic
  modules. **Zero runtime and dev dependencies** (`package.json` is `"type": "module"`).
- **No server, no network, no auth.** The whole game is static files served over http; star
  badges persist in `localStorage`.

## Components

1. **Physics core** — a `World` of bodies (`{ pos, vel, mass, radius }`) and a pure
   `step(world, dt)` that applies gravity, integrates velocity then position at a **fixed
   timestep**, so the simulation is deterministic and unit-testable.
2. **Launchers** — three ways to put an object in motion, each a pure function from
   launcher settings to an initial velocity or applied force:
   - **Cannon** — angle + power → an initial velocity vector.
   - **Ramp** — a slope the object rolls down; its incline + height → launch direction and speed.
   - **Planet** — a body with **radial gravity** that pulls nearby objects toward its center
     (slingshots), applied as a force during `step`.
3. **Collision** — pure predicates and responses: wall/ground **bounce** (restitution),
   **target-hit** detection (circle overlap), and **rest** detection (speed below epsilon).
4. **Levels** — each puzzle is a **declarative level object** (gravity, the launchers on
   offer, targets, obstacles, star thresholds). A loader validates a level and builds a
   `World` from it. See [ADR-0003](docs/adr/0003-levels-are-declarative-data.md).
5. **Scoring / star badges** — a pure function: solve = every target hit in one attempt;
   **1–3 stars** by per-level efficiency thresholds. See
   [ADR-0004](docs/adr/0004-star-badge-scoring-contract.md).
6. **Renderer + game loop + controls** — a Canvas renderer draws the world each frame; the
   game loop advances the fixed-step physics with an accumulator; on-screen controls
   (gravity, mass, launch angle, power, launcher choice, level select, Launch/Reset) let a
   player run experiments. This layer is the **UI-smoke**, not the unit-tested core.

## Data model (decided)

No database — the model is in-memory game state plus declarative content:

- **`World`** — `{ gravity: Vec2, bodies: Body[], planets: Planet[], targets: Target[],
  walls: Rect[] }`, rebuilt from a level on load / reset.
- **`Body`** — `{ pos: Vec2, vel: Vec2, mass: number, radius: number, kind: string }`
  (the cartoon object being launched).
- **`Level`** — declarative: `{ id, name, gravity, launchers: [...], targets: [...],
  obstacles: [...], starThresholds: { three, two } }` (see ADR-0003).
- **Badges** — the earned star count per level id, persisted in `localStorage` (client-only;
  the scoring *logic* is pure and tested independent of storage).

## Module layout (decided)

Keep it flat and small; the pure logic is DOM-free so `node --test` can drive it:

- `index.html` — the canvas + control panel; loads `src/main.js` as a module.
- `src/vec2.js` — 2-D vector helpers (add, scale, length, …).
- `src/physics.js` — `World` + the fixed-timestep `step(world, dt)` integrator.
- `src/launchers.js` — cannon / ramp / planet → initial velocity or applied force.
- `src/collision.js` — wall/ground bounce, target-hit, rest detection.
- `src/levels.js` — the declarative level data + a `loadLevel(level)` validator/builder.
- `src/scoring.js` — the pure star-badge scoring function.
- `src/render.js` — the Canvas 2D renderer (draws bodies, launchers, targets — UI-smoke).
- `src/main.js` — input controls + the accumulator game loop + render glue.
- `test/*.test.js` — `node --test` over physics, launchers, collision, levels, scoring.
- `package.json` — `"type": "module"`, a `test` script, **no dependencies**.
- `README.md` — how to serve, play, and run the tests.

## Determinism (decided)

The unit-tested core runs at a **fixed timestep** (`step(world, dt)` with a constant `dt`),
so a sequence of steps is fully reproducible: tests drop a body under gravity for N steps
and assert its position. The real-time loop uses an **accumulator** to call the same
fixed-step integrator a deterministic number of times per frame — smooth rendering, identical
physics. A run's variance therefore comes from the model building it, not a flaky fixture.
