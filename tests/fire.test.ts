import { describe, expect, it } from 'vitest';
import { createFireState, MAX_SHOTS_PER_STEP, stepFire, type FireState } from '../src/core/fire';
import { stepRepeatingTimer } from '../src/core/timer';

const RATE = 3;

function shotsOver(state: FireState, seconds: number, dt: number) {
  let shots = 0;
  const frames = Math.round(seconds / dt);
  for (let frame = 0; frame < frames; frame++) {
    const step = stepFire(state, RATE, dt);
    state = step.state;
    shots += step.shots;
  }
  return { state, shots };
}

describe('stepFire', () => {
  it('fires 3 shots per second at 60 frames per second', () => {
    expect(shotsOver(createFireState(), 1, 1 / 60).shots).toBe(3);
    expect(shotsOver(createFireState(), 10, 1 / 60).shots).toBe(30);
  });

  it.each([1 / 30, 1 / 144, 1 / 240])('does not drift at a frame time of %f s', (dt) => {
    expect(shotsOver(createFireState(), 20, dt).shots).toBe(60);
  });

  it('does not fire before the first interval has passed', () => {
    expect(shotsOver(createFireState(), 0.3, 1 / 60).shots).toBe(0);
  });

  it('fires single shots a third of a second apart', () => {
    let state = createFireState();
    const shotFrames: number[] = [];
    for (let frame = 1; frame <= 60; frame++) {
      const step = stepFire(state, RATE, 1 / 60);
      state = step.state;
      expect(step.shots).toBeLessThanOrEqual(1);
      if (step.shots === 1) {
        shotFrames.push(frame);
      }
    }
    expect(shotFrames).toEqual([20, 40, 60]);
  });

  it('caps the shots released by one long frame', () => {
    // 5 s at 3 shots per second would be 15 shots.
    const step = stepFire(createFireState(), RATE, 5);
    expect(step.shots).toBe(MAX_SHOTS_PER_STEP);
  });

  it('does not release the dropped backlog as a burst afterwards', () => {
    const long = stepFire(createFireState(), RATE, 5);
    const after = shotsOver(long.state, 1, 1 / 60);
    expect(after.shots).toBe(3);
  });
});

describe('stepRepeatingTimer', () => {
  it('reports nothing until the interval has passed', () => {
    expect(stepRepeatingTimer(0, 2, 1.5, 1)).toEqual({ elapsedSeconds: 1.5, due: 0 });
  });

  it('carries the remainder over', () => {
    const step = stepRepeatingTimer(1.5, 2, 1, 1);
    expect(step.due).toBe(1);
    expect(step.elapsedSeconds).toBeCloseTo(0.5);
  });

  it('never reports more than the cap', () => {
    expect(stepRepeatingTimer(0, 2, 100, 1).due).toBe(1);
  });
});
