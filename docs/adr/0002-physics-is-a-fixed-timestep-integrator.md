# 0002. Physics is a hand-written fixed-timestep integrator

- **Status:** Accepted
- **Date:** 2026-08-13

## Context

The game simulates gravity, mass, and motion — objects launched from cannons, rolled down
ramps, and pulled by planets. This could lean on a physics library (matter.js, planck) or be
written by hand. As a benchmark fixture the simulation must be **deterministic** (so tests
and grading are reproducible) and **dependency-light** (ADR-0001). Frame-rate-coupled
integration (`step(dt)` with the real frame delta) is non-deterministic and unstable.

## Decision

Write the physics by hand as a **fixed-timestep semi-implicit (symplectic) Euler
integrator**. `step(world, dt)` uses a **constant** `dt`: it accumulates forces (uniform
gravity plus each planet's radial pull), updates each body's velocity, then its position.
The real-time loop keeps an **accumulator** and calls `step` a whole number of fixed
substeps per rendered frame, so rendering is smooth but the simulation is identical
regardless of frame rate. No physics library.

## Consequences

- The core is deterministic and pure: a test can drop a body under gravity for N fixed steps
  and assert the trajectory within tolerance; two runs never diverge. Semi-implicit Euler is
  stable enough for the game's speeds and cheap to compute.
- Writing the integrator, launcher math, and collision ourselves is more code than importing
  an engine — but it is exactly the modelling exercise this heavy fixture is meant to
  exercise, and it keeps determinism and the zero-dependency stance intact.
