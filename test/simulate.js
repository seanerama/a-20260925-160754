// Test-only helper (NOT a *.test.js file — the runner glob is test/*.test.js
// so this is never picked up as a suite). Runs one launch attempt to
// completion using the same per-substep composition the stage-9 game loop
// must use: resolveCollisions(step(world, FIXED_DT)) repeated until
// attemptStatus stops returning 'running'.

import { step, FIXED_DT } from '../src/physics.js';
import { resolveCollisions, attemptStatus, MAX_ATTEMPT_SECONDS } from '../src/collision.js';

/**
 * @param {import('../src/physics.js').World} world world BEFORE the body is added
 * @param {import('../src/physics.js').Body} body the launched body
 * @returns {{ status: 'all-hit' | 'rest' | 'timeout', world: import('../src/physics.js').World }}
 */
export function simulateAttempt(world, body) {
  let current = { ...world, bodies: [...world.bodies, body] };
  let elapsedSeconds = 0;
  let status = attemptStatus(current, elapsedSeconds);

  // Safety belt on top of MAX_ATTEMPT_SECONDS so a test can never hang even
  // if attemptStatus somehow failed to report timeout.
  const maxSteps = Math.ceil((MAX_ATTEMPT_SECONDS + 1) / FIXED_DT);
  let stepsTaken = 0;

  while (status === 'running' && stepsTaken < maxSteps) {
    current = resolveCollisions(step(current, FIXED_DT));
    elapsedSeconds += FIXED_DT;
    status = attemptStatus(current, elapsedSeconds);
    stepsTaken += 1;
  }

  return { status, world: current };
}
