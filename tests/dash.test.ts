import { describe, expect, it } from 'vitest';
import {
  createDashState,
  dashDirection,
  dashReadiness,
  isDashReady,
  stepDash,
  type DashInput,
  type DashState,
} from '../src/core/dash';
import { applyDamage, createHealth } from '../src/core/health';
import type { Vec2 } from '../src/core/movement';

const TUNING = { distance: 180, durationSeconds: 0.15, cooldownSeconds: 1.5 };
const DT = 1 / 60;
const RIGHT: Vec2 = { x: 1, y: 0 };
const UP: Vec2 = { x: 0, y: -1 };
const NO_MOVE: Vec2 = { x: 0, y: 0 };

const input = (overrides: Partial<DashInput> = {}): DashInput => ({
  keyHeld: false,
  moveDirection: NO_MOVE,
  aimDirection: RIGHT,
  ...overrides,
});

/** Steps the dash for the given time and returns the final state and total movement. */
function run(state: DashState, seconds: number, frameInput: (frame: number) => DashInput) {
  const total = { x: 0, y: 0 };
  let dashes = 0;
  const frames = Math.round(seconds / DT);
  for (let frame = 0; frame < frames; frame++) {
    const wasActive = state.activeSeconds > 0;
    const step = stepDash(state, frameInput(frame), TUNING, DT);
    if (!wasActive && step.dashing) {
      dashes++;
    }
    state = step.state;
    total.x += step.displacement.x;
    total.y += step.displacement.y;
  }
  return { state, total, dashes };
}

const press = (rest: Partial<DashInput> = {}) => {
  return (frame: number) => input({ ...rest, keyHeld: frame === 0 });
};

describe('dashDirection', () => {
  it('follows the movement direction when a movement key is held', () => {
    expect(dashDirection(UP, RIGHT)).toEqual(UP);
  });

  it('goes towards the cursor when no movement key is held', () => {
    expect(dashDirection(NO_MOVE, RIGHT)).toEqual(RIGHT);
  });
});

describe('stepDash', () => {
  it('starts ready and does nothing until the key is pressed', () => {
    const state = createDashState();
    expect(isDashReady(state)).toBe(true);

    const result = run(state, 1, () => input());
    expect(result.total).toEqual({ x: 0, y: 0 });
    expect(result.dashes).toBe(0);
    expect(isDashReady(result.state)).toBe(true);
  });

  it('covers the configured distance in a short burst', () => {
    const result = run(createDashState(), 0.5, press({ moveDirection: UP }));

    expect(result.total.x).toBeCloseTo(0);
    expect(result.total.y).toBeCloseTo(-TUNING.distance);
    expect(result.dashes).toBe(1);
  });

  it('covers the same distance at a low frame rate', () => {
    let state = createDashState();
    let travelled = 0;
    for (let frame = 0; frame < 10; frame++) {
      const step = stepDash(state, input({ keyHeld: frame === 0 }), TUNING, 0.1);
      state = step.state;
      travelled += step.displacement.x;
    }
    expect(travelled).toBeCloseTo(TUNING.distance);
  });

  it('finishes the burst within its duration', () => {
    const during = run(createDashState(), TUNING.durationSeconds / 2, press());
    expect(during.state.activeSeconds).toBeGreaterThan(0);

    const after = run(createDashState(), TUNING.durationSeconds + 2 * DT, press());
    expect(after.state.activeSeconds).toBe(0);
    expect(after.total.x).toBeCloseTo(TUNING.distance);
  });

  it('locks its direction when it starts', () => {
    // Dash up, then switch to holding right and aiming down mid-dash.
    const result = run(createDashState(), 0.5, (frame) =>
      frame === 0
        ? input({ keyHeld: true, moveDirection: UP })
        : input({ moveDirection: RIGHT, aimDirection: { x: 0, y: 1 } }),
    );

    expect(result.total.x).toBeCloseTo(0);
    expect(result.total.y).toBeCloseTo(-TUNING.distance);
  });

  it('is not ready during the cooldown and ignores presses then', () => {
    const first = run(createDashState(), 0.5, press());
    expect(isDashReady(first.state)).toBe(false);

    // A fresh press 0.5 s into the 1.5 s cooldown.
    const second = run(first.state, 0.5, press());
    expect(second.total).toEqual({ x: 0, y: 0 });
    expect(second.dashes).toBe(0);
  });

  it('is ready again once the cooldown of 1.5 s has passed', () => {
    const justBefore = run(createDashState(), 1.4, press());
    expect(isDashReady(justBefore.state)).toBe(false);

    const after = run(createDashState(), 1.6, press());
    expect(isDashReady(after.state)).toBe(true);

    const again = run(after.state, 0.5, press());
    expect(again.dashes).toBe(1);
    expect(again.total.x).toBeCloseTo(TUNING.distance);
  });

  it('does not dash again while the key stays held after the cooldown ends', () => {
    const held = run(createDashState(), 5, () => input({ keyHeld: true }));

    expect(held.dashes).toBe(1);
    expect(held.total.x).toBeCloseTo(TUNING.distance);
    expect(isDashReady(held.state)).toBe(true);
  });

  it('does not dash when a key pressed during the cooldown is still held at its end', () => {
    const first = run(createDashState(), 0.5, press());
    const heldThrough = run(first.state, 3, () => input({ keyHeld: true }));

    expect(heldThrough.dashes).toBe(0);
    expect(isDashReady(heldThrough.state)).toBe(true);
  });

  it('dashes again after the key is released and pressed anew', () => {
    const held = run(createDashState(), 3, () => input({ keyHeld: true }));
    const released = run(held.state, 0.1, () => input());
    const again = run(released.state, 0.5, press());

    expect(again.dashes).toBe(1);
  });

  it('reports readiness from 0 just after a dash to 1 when ready', () => {
    expect(dashReadiness(createDashState(), TUNING)).toBe(1);

    const started = stepDash(createDashState(), input({ keyHeld: true }), TUNING, DT).state;
    expect(dashReadiness(started, TUNING)).toBe(0);

    const halfway = run(started, 0.75, () => input()).state;
    expect(dashReadiness(halfway, TUNING)).toBeCloseTo(0.5);
  });
});

describe('dash and damage', () => {
  it('grants no invulnerability: a hit taken mid-dash does full damage', () => {
    const dashing = stepDash(createDashState(), input({ keyHeld: true }), TUNING, DT);
    expect(dashing.dashing).toBe(true);
    expect(dashing.state.activeSeconds).toBeGreaterThan(0);

    // Damage depends on health state alone; nothing about the dash feeds into it.
    const hit = applyDamage(createHealth(100), 10, 0.8);
    expect(hit.damaged).toBe(true);
    expect(hit.state.current).toBe(90);
  });
});
