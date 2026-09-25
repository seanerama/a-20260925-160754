# Benchmark A

Benchmark fixture A (control app), provisioned 2026-09-25T16:07:54.239Z

> Scaffolded by [Verity](https://github.com/seanerama/verity-framework) — prompt to production, proven.

## Status

See [`STATUS.md`](STATUS.md) for live runtime state (deployed version, environments).

## Project identity

- **slug:** `a-20260925-160754`
- **images:** `ghcr.io/seanerama/a-20260925-160754`

## Play

This is a zero-build static app — no bundler, no install step.

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

## Test

```sh
npm test
```

Runs the `node:test` suite (`node --test test/*.test.js`).
