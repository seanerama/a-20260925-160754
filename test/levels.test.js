import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, validateLevel, loadLevel, LevelError, spawnBody } from '../src/levels.js';
import { cannonVelocity, rampVelocity } from '../src/launchers.js';
import { length } from '../src/vec2.js';
import { simulateAttempt } from './simulate.js';

// A known-good level to mutate for the invalid-variant table and for
// loadLevel mapping assertions.
const BASE_LEVEL = {
  id: 'test-level',
  name: 'Test Level',
  gravity: { x: 0, y: 500 },
  launchers: [{ type: 'cannon', pos: { x: 50, y: 480 }, angle: 45, power: 400 }],
  targets: [{ pos: { x: 500, y: 500 }, radius: 20 }],
  obstacles: [{ rect: { x: 300, y: 480, w: 20, h: 20 } }],
  starThresholds: { three: 1, two: 3 },
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// --- LEVELS sanity ----------------------------------------------------

test('LEVELS: at least 3 levels, all valid, unique ids', () => {
  assert.ok(LEVELS.length >= 3, 'expected at least 3 levels');
  for (const level of LEVELS) {
    assert.deepEqual(validateLevel(level), [], `level "${level.id}" should be valid`);
  }
  const ids = LEVELS.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'level ids must be unique');
});

test('BASE_LEVEL fixture itself is valid (sanity check for the invalid-variant table below)', () => {
  assert.deepEqual(validateLevel(BASE_LEVEL), []);
});

// --- loadLevel mapping --------------------------------------------------

test('loadLevel: maps gravity, planets, targets (hit:false), walls, bodies:[], bounds 960x540', () => {
  const level = {
    id: 'mapping-test',
    name: 'Mapping Test',
    gravity: { x: 1, y: 500 },
    launchers: [
      { type: 'cannon', pos: { x: 50, y: 480 }, angle: 45, power: 400 },
      { type: 'planet', pos: { x: 400, y: 200 }, radius: 30, mass: 1000 },
    ],
    targets: [{ pos: { x: 700, y: 300 }, radius: 25 }],
    obstacles: [{ rect: { x: 200, y: 200, w: 30, h: 30 } }],
    starThresholds: { three: 1, two: 2 },
  };

  const world = loadLevel(level);

  assert.deepEqual(world.gravity, { x: 1, y: 500 });
  assert.deepEqual(world.bodies, []);
  assert.deepEqual(world.planets, [{ pos: { x: 400, y: 200 }, radius: 30, mass: 1000 }]);
  assert.deepEqual(world.targets, [{ pos: { x: 700, y: 300 }, radius: 25, hit: false }]);
  assert.deepEqual(world.walls, [{ x: 200, y: 200, w: 30, h: 30 }]);
  assert.deepEqual(world.bounds, { x: 0, y: 0, w: 960, h: 540 });
});

test('loadLevel: mutating the returned world never changes LEVELS (no aliasing)', () => {
  const level = LEVELS[0];
  const before = clone(level);

  const world = loadLevel(level);
  world.gravity.x = 99999;
  world.planets.push({ pos: { x: 0, y: 0 }, radius: 1, mass: 1 });
  world.targets.push({ pos: { x: 0, y: 0 }, radius: 1, hit: true });
  if (world.targets[0]) world.targets[0].hit = true;
  world.walls.push({ x: 0, y: 0, w: 1, h: 1 });
  world.bodies.push({});
  world.bounds.x = 12345;

  assert.deepEqual(level, before, 'LEVELS entry must be untouched after mutating the loaded world');
});

// --- Invalid levels: table-driven, >= 8 variants, one per contract rule --

const INVALID_VARIANTS = [
  {
    name: 'missing id',
    mutate: (l) => {
      delete l.id;
    },
  },
  {
    name: 'empty name',
    mutate: (l) => {
      l.name = '   ';
    },
  },
  {
    name: 'non-finite gravity',
    mutate: (l) => {
      l.gravity = { x: 0, y: NaN };
    },
  },
  {
    name: 'no cannon/ramp launcher (planet only)',
    mutate: (l) => {
      l.launchers = [{ type: 'planet', pos: { x: 400, y: 200 }, radius: 30, mass: 500 }];
    },
  },
  {
    name: 'unknown launcher type',
    mutate: (l) => {
      l.launchers = [{ type: 'trebuchet', pos: { x: 50, y: 480 }, angle: 45, power: 400 }];
    },
  },
  {
    name: 'out-of-range launcher settings (cannon angle > 90)',
    mutate: (l) => {
      l.launchers = [{ type: 'cannon', pos: { x: 50, y: 480 }, angle: 200, power: 400 }];
    },
  },
  {
    name: 'no targets',
    mutate: (l) => {
      l.targets = [];
    },
  },
  {
    name: 'target radius <= 0',
    mutate: (l) => {
      l.targets = [{ pos: { x: 500, y: 500 }, radius: 0 }];
    },
  },
  {
    name: 'obstacle rect with w <= 0',
    mutate: (l) => {
      l.obstacles = [{ rect: { x: 300, y: 480, w: 0, h: 20 } }];
    },
  },
  {
    name: 'missing starThresholds',
    mutate: (l) => {
      delete l.starThresholds;
    },
  },
  {
    name: 'starThresholds.three > two',
    mutate: (l) => {
      l.starThresholds = { three: 5, two: 2 };
    },
  },
  {
    name: 'starThresholds.three < 1',
    mutate: (l) => {
      l.starThresholds = { three: 0, two: 2 };
    },
  },
  {
    name: 'non-finite coordinate (launcher pos.x = Infinity)',
    mutate: (l) => {
      l.launchers = [{ type: 'cannon', pos: { x: Infinity, y: 480 }, angle: 45, power: 400 }];
    },
  },
];

test(`invalid levels are rejected (${INVALID_VARIANTS.length} malformed variants)`, () => {
  assert.ok(INVALID_VARIANTS.length >= 8, 'must cover at least 8 contract rules');

  for (const { name, mutate } of INVALID_VARIANTS) {
    const level = clone(BASE_LEVEL);
    mutate(level);

    const errors = validateLevel(level);
    assert.ok(errors.length >= 1, `[${name}] validateLevel should report at least one error`);

    assert.throws(
      () => loadLevel(level),
      (err) => {
        assert.ok(err instanceof LevelError, `[${name}] should throw a LevelError`);
        assert.equal(err.name, 'LevelError');
        assert.ok(Array.isArray(err.errors) && err.errors.length >= 1, `[${name}] .errors must be non-empty`);
        return true;
      },
      `[${name}] loadLevel should throw`,
    );
  }
});

test('validateLevel never throws, even on wildly malformed input', () => {
  assert.doesNotThrow(() => validateLevel(null));
  assert.doesNotThrow(() => validateLevel(undefined));
  assert.doesNotThrow(() => validateLevel({}));
  assert.doesNotThrow(() => validateLevel('not an object'));
  assert.doesNotThrow(() => validateLevel(42));
});

// --- Solvability ----------------------------------------------------------

// Coarse grid search over a level's cannon/ramp launchers, per the stage-6
// testing requirements: angle step 5deg, power step 25, mass 1, ramp as-built.
// Stops at the first success. Returns the winning (launcher, angle, power) or
// null.
function findSolution(level, world, { daRange, dpRange }) {
  for (const launcher of level.launchers) {
    if (launcher.type === 'cannon') {
      for (let da = daRange[0]; da <= daRange[1]; da += 5) {
        for (let dp = dpRange[0]; dp <= dpRange[1]; dp += 25) {
          const angle = launcher.angle + da;
          const power = launcher.power + dp;
          if (angle < 0 || angle > 90 || power <= 0) continue;
          const body = spawnBody({ ...launcher, angle, power }, { mass: 1, gravity: level.gravity });
          const { status } = simulateAttempt(world, body);
          if (status === 'all-hit') {
            return { launcher: 'cannon', angle, power, da, dp };
          }
        }
      }
    } else if (launcher.type === 'ramp') {
      const body = spawnBody(launcher, { mass: 1, gravity: level.gravity });
      const { status } = simulateAttempt(world, body);
      if (status === 'all-hit') {
        return { launcher: 'ramp' };
      }
    }
  }
  return null;
}

// Per-level search windows. Level 1 must additionally be solvable within
// +-10deg / +-100 power of its cannon defaults (tested separately below);
// the other levels get a wider +-30deg / +-300 power coarse search.
const SOLVABILITY_GRID = {
  'first-flight': { daRange: [-10, 10], dpRange: [-100, 100] },
  'ramp-run': { daRange: [-30, 30], dpRange: [-300, 300] },
  'planet-slingshot': { daRange: [-30, 30], dpRange: [-300, 300] },
};

test('every level in LEVELS is solvable by a coarse grid search', () => {
  for (const level of LEVELS) {
    const world = loadLevel(level);
    const grid = SOLVABILITY_GRID[level.id] ?? { daRange: [-30, 30], dpRange: [-300, 300] };
    const solution = findSolution(level, world, grid);
    assert.ok(solution, `level "${level.id}" should be solvable, found: ${JSON.stringify(solution)}`);
  }
});

test('First Flight is solvable within +-10deg / +-100 power of the cannon defaults', () => {
  const level = LEVELS.find((l) => l.id === 'first-flight');
  assert.ok(level, 'expected a "first-flight" level');
  const world = loadLevel(level);
  const solution = findSolution(level, world, { daRange: [-10, 10], dpRange: [-100, 100] });
  assert.ok(solution, 'expected a solution within +-10deg / +-100 power of the defaults');
});

test('Planet Slingshot is NOT solvable (same grid) once its planet is removed', () => {
  const level = LEVELS.find((l) => l.id === 'planet-slingshot');
  assert.ok(level, 'expected a "planet-slingshot" level');

  const noPlanetLevel = { ...level, launchers: level.launchers.filter((l) => l.type !== 'planet') };
  const world = loadLevel(noPlanetLevel);
  const grid = SOLVABILITY_GRID['planet-slingshot'];
  const solution = findSolution(noPlanetLevel, world, grid);

  assert.equal(solution, null, 'should not be solvable without the planet — the slingshot must matter');
});

// --- spawnBody --------------------------------------------------------

test('spawnBody: cannon launcher builds the contract body', () => {
  const launcher = { type: 'cannon', pos: { x: 50, y: 480 }, angle: 30, power: 200 };
  const gravity = { x: 0, y: 500 };
  const body = spawnBody(launcher, { mass: 2, gravity });

  const expectedVel = cannonVelocity({ angle: 30, power: 200 }, 2);
  assert.deepEqual(body.pos, { x: 50, y: 480 });
  assert.deepEqual(body.vel, expectedVel);
  assert.equal(body.mass, 2);
  assert.equal(body.radius, 12);
  assert.equal(body.kind, 'ball');
});

test('spawnBody: ramp launcher builds the contract body using length(gravity) as g', () => {
  const launcher = { type: 'ramp', pos: { x: 100, y: 350 }, incline: 20, height: 150, direction: 1 };
  const gravity = { x: 0, y: 500 };
  const body = spawnBody(launcher, { mass: 1, gravity });

  const expectedVel = rampVelocity({ incline: 20, height: 150, direction: 1 }, length(gravity));
  assert.deepEqual(body.pos, { x: 100, y: 350 });
  assert.deepEqual(body.vel, expectedVel);
  assert.equal(body.mass, 1);
  assert.equal(body.radius, 12);
  assert.equal(body.kind, 'ball');
});

test('spawnBody: throws for a planet launcher', () => {
  const launcher = { type: 'planet', pos: { x: 400, y: 200 }, radius: 30, mass: 1000 };
  assert.throws(() => spawnBody(launcher, { mass: 1, gravity: { x: 0, y: 500 } }));
});

test('spawnBody: pos is a copy, not an alias of launcher.pos', () => {
  const launcher = { type: 'cannon', pos: { x: 50, y: 480 }, angle: 30, power: 200 };
  const body = spawnBody(launcher, { mass: 1, gravity: { x: 0, y: 500 } });
  body.pos.x = 99999;
  assert.equal(launcher.pos.x, 50, 'mutating the returned body must not affect the launcher');
});
