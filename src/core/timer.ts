export interface TimerStep {
  /** Time carried over towards the next event, in seconds. */
  elapsedSeconds: number;
  /** How many events are due this step. */
  due: number;
}

/**
 * Advances a repeating timer and reports how many events are due.
 *
 * The remainder is carried over so the long-run rate does not drift with the
 * frame rate. At most `maxDue` events are reported; the backlog from a very
 * long frame is dropped instead of being released as a burst later.
 */
export function stepRepeatingTimer(
  elapsedSeconds: number,
  intervalSeconds: number,
  deltaSeconds: number,
  maxDue: number,
): TimerStep {
  const total = elapsedSeconds + deltaSeconds;
  // The small epsilon stops rounding error from delaying an event by a frame.
  const due = Math.floor(total / intervalSeconds + 1e-9);
  return {
    elapsedSeconds: Math.max(0, total - due * intervalSeconds),
    due: Math.min(due, maxDue),
  };
}
