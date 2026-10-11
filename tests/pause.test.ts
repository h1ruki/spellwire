import { describe, expect, it } from 'vitest';
import { MAX_FRAME_SECONDS, playSeconds } from '../src/core/clock';
import { createDashState, holdDashKey, stepDash, type DashInput } from '../src/core/dash';
import { createFireState, stepFire } from '../src/core/fire';
import { createHealth } from '../src/core/health';
import {
  addPendingOffers,
  createPendingOffers,
  hasPendingOffers,
  openNextOffer,
  resolveOffer,
} from '../src/core/offers';
import { createRng } from '../src/core/rng';
import { createSpawnerState, stepSpawner } from '../src/core/schedule';
import { applyHitEffects, createStatus, tickStatus } from '../src/core/status';
import { createBuild } from '../src/core/upgrade';
import { fire, frost, shipped } from './shipped';

const { tuning } = shipped;
const FRAME_MS = 1000 / 60;
const RIGHT = { x: 1, y: 0 };
const input = (keyHeld: boolean): DashInput => ({
  keyHeld,
  moveDirection: RIGHT,
  aimDirection: RIGHT,
});

describe('playSeconds', () => {
  it('turns a frame into seconds while playing', () => {
    expect(playSeconds(16, false)).toBeCloseTo(0.016);
  });

  it('is 0 while paused, however long the frame was', () => {
    expect(playSeconds(16, true)).toBe(0);
    expect(playSeconds(3_600_000, true)).toBe(0);
  });

  it('shortens a very long frame and ignores a negative one', () => {
    expect(playSeconds(60_000, false)).toBe(MAX_FRAME_SECONDS);
    expect(playSeconds(-5, false)).toBe(0);
  });
});

/** Everything that runs on play time, part-way through its timers. */
function midRun() {
  // 0.2 s into a shot interval, just dashed, burning and slowed, a spawn timer running.
  const fireState = stepFire(createFireState(), tuning.fire.shotsPerSecond, 0.2).state;
  const pressed = stepDash(createDashState(), input(true), tuning.dash, 0.016).state;
  const dash = stepDash(pressed, input(false), tuning.dash, 0.3).state;
  const status = tickStatus(
    applyHitEffects(createStatus(), { burn: fire.burn, slow: frost.slow }),
    createHealth(60),
    tuning.burn.tickIntervalSeconds,
    0.2,
  ).status;
  const rules = [{ enemy: 'swarmer', intervalSeconds: 2, groupSize: 2 }];
  const spawner = stepSpawner(stepSpawner(createSpawnerState(), rules, 0).state, rules, 0.5).state;
  return { fireState, dash, status, health: createHealth(60), spawner, rules, clock: 12.5 };
}

/** One frame of the arena's rules, stepped the way the scene steps them. */
function frame(state: ReturnType<typeof midRun>, frameMs: number, paused: boolean) {
  const deltaSeconds = playSeconds(frameMs, paused);
  if (paused) {
    // The scene steps nothing during an offer; it only notes whether Space is held.
    return { state: { ...state, dash: holdDashKey(state.dash, false) }, shots: 0, spawned: 0 };
  }
  const fireStep = stepFire(state.fireState, tuning.fire.shotsPerSecond, deltaSeconds);
  const dashStep = stepDash(state.dash, input(false), tuning.dash, deltaSeconds);
  const tick = tickStatus(
    state.status,
    state.health,
    tuning.burn.tickIntervalSeconds,
    deltaSeconds,
  );
  const spawn = stepSpawner(state.spawner, state.rules, deltaSeconds);
  return {
    state: {
      ...state,
      fireState: fireStep.state,
      dash: dashStep.state,
      status: tick.status,
      health: tick.health,
      spawner: spawn.state,
      clock: state.clock + deltaSeconds,
    },
    shots: fireStep.shots,
    spawned: spawn.due.length,
  };
}

describe('while an offer is open', () => {
  it.each([1, 60, 60 * 60 * 10])('nothing advances over %d paused frames', (frames) => {
    const before = midRun();
    let state = before;
    let shots = 0;
    let spawned = 0;
    for (let i = 0; i < frames; i++) {
      const step = frame(state, FRAME_MS, true);
      state = step.state;
      shots += step.shots;
      spawned += step.spawned;
    }

    expect(shots).toBe(0);
    expect(spawned).toBe(0);
    expect(state.clock).toBe(before.clock);
    expect(state.fireState).toEqual(before.fireState);
    expect(state.dash.cooldownSeconds).toBe(before.dash.cooldownSeconds);
    expect(state.dash.activeSeconds).toBe(before.dash.activeSeconds);
    expect(state.status.burn).toEqual(before.status.burn);
    expect(state.status.slow).toEqual(before.status.slow);
    expect(state.health).toEqual(before.health);
    expect(state.spawner).toEqual(before.spawner);
  });

  it('nothing catches up on resume: the first frame back is an ordinary frame', () => {
    const before = midRun();
    let paused = before;
    for (let i = 0; i < 600; i++) {
      paused = frame(paused, FRAME_MS, true).state;
    }

    const resumed = frame(paused, FRAME_MS, false);
    const never = frame(before, FRAME_MS, false);
    expect(resumed).toEqual(never);
    expect(resumed.shots).toBe(0);
    expect(resumed.state.clock).toBeCloseTo(before.clock + 1 / 60);
  });

  it('even a long first frame back releases no burst', () => {
    const before = midRun();
    const resumed = frame(frame(before, 10 * 60_000, true).state, 10 * 60_000, false);
    expect(resumed.state.clock).toBeCloseTo(before.clock + MAX_FRAME_SECONDS);
    expect(resumed.shots).toBeLessThanOrEqual(1);
    expect(resumed.state.dash.cooldownSeconds).toBeCloseTo(
      before.dash.cooldownSeconds - MAX_FRAME_SECONDS,
    );
    expect(resumed.state.status.burn?.remainingSeconds).toBeCloseTo(
      (before.status.burn?.remainingSeconds ?? 0) - MAX_FRAME_SECONDS,
    );
    expect(resumed.state.status.slow?.remainingSeconds).toBeCloseTo(
      (before.status.slow?.remainingSeconds ?? 0) - MAX_FRAME_SECONDS,
    );
  });
});

describe('the dash key across an offer', () => {
  it('held through the offer, it does not dash on resume', () => {
    // Ready to dash and Space not held when the offer opens.
    let dash = createDashState();
    // Space is pressed during the offer and is still down when play resumes.
    dash = holdDashKey(dash, true);
    expect(dash.cooldownSeconds).toBe(0);

    const resumed = stepDash(dash, input(true), tuning.dash, 0.016);
    expect(resumed.dashing).toBe(false);
  });

  it('pressed afresh after the offer, it dashes', () => {
    let dash = holdDashKey(createDashState(), true);
    dash = stepDash(dash, input(false), tuning.dash, 0.016).state;
    expect(stepDash(dash, input(true), tuning.dash, 0.016).dashing).toBe(true);
  });

  it('released during the offer and pressed again after, it dashes', () => {
    // Space is held down from a dash that has long since cooled down.
    const dashed = stepDash(createDashState(), input(true), tuning.dash, 0.016).state;
    const heldAtOpen = stepDash(dashed, input(true), tuning.dash, 2).state;
    const released = holdDashKey(heldAtOpen, false);
    expect(stepDash(released, input(true), tuning.dash, 0.016).dashing).toBe(true);
  });

  it('noting the key never moves the cooldown or the burst', () => {
    const dashing = stepDash(createDashState(), input(true), tuning.dash, 0.016).state;
    const noted = holdDashKey(holdDashKey(dashing, false), true);
    expect(noted.cooldownSeconds).toBe(dashing.cooldownSeconds);
    expect(noted.activeSeconds).toBe(dashing.activeSeconds);
    expect(noted.direction).toEqual(dashing.direction);
  });
});

describe('pausing follows the pending offers', () => {
  it('is paused from the level-up until the last offer is resolved', () => {
    const pool = { parts: shipped.parts, boosts: shipped.boosts };
    const rng = createRng(1);
    let offers = createPendingOffers();
    expect(playSeconds(FRAME_MS, hasPendingOffers(offers))).toBeGreaterThan(0);

    offers = addPendingOffers(offers, 2);
    expect(playSeconds(FRAME_MS, hasPendingOffers(offers))).toBe(0);

    offers = resolveOffer(openNextOffer(offers, pool, createBuild().loadout, rng));
    expect(playSeconds(FRAME_MS, hasPendingOffers(offers))).toBe(0);

    offers = resolveOffer(openNextOffer(offers, pool, createBuild().loadout, rng));
    expect(playSeconds(FRAME_MS, hasPendingOffers(offers))).toBeGreaterThan(0);
  });
});
