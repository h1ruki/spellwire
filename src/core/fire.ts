import { stepRepeatingTimer } from './timer';

/** Upper limit on shots released by a single frame, however long it was. */
export const MAX_SHOTS_PER_STEP = 2;

export interface FireState {
  /** Time since the last shot was due, in seconds. */
  elapsedSeconds: number;
}

export interface FireStep {
  state: FireState;
  /** How many shots to fire this frame. */
  shots: number;
}

export function createFireState(): FireState {
  return { elapsedSeconds: 0 };
}

/** The basic shot fires on its own at a steady rate; there is no fire button. */
export function stepFire(state: FireState, shotsPerSecond: number, deltaSeconds: number): FireStep {
  const step = stepRepeatingTimer(
    state.elapsedSeconds,
    1 / shotsPerSecond,
    deltaSeconds,
    MAX_SHOTS_PER_STEP,
  );
  return { state: { elapsedSeconds: step.elapsedSeconds }, shots: step.due };
}
