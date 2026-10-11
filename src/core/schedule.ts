import { stepRepeatingTimer } from './timer';

/** One enemy type arriving in groups at a steady interval. */
export interface SpawnRule {
  /** Name of an entry in the enemies file. */
  enemy: string;
  intervalSeconds: number;
  groupSize: number;
}

/**
 * Everything that spawns from `atSeconds` until the next phase starts. A phase
 * is a complete snapshot, not a change to the phase before it.
 */
export interface SpawnPhase {
  atSeconds: number;
  spawns: SpawnRule[];
}

/**
 * The phase in force at the given run time: the latest one that has started.
 * The last phase continues for the rest of the run. Before the first phase
 * starts there is none. The timeline must be sorted by `atSeconds`.
 */
export function activePhase(
  timeline: readonly SpawnPhase[],
  elapsedSeconds: number,
): SpawnPhase | null {
  let active: SpawnPhase | null = null;
  for (const phase of timeline) {
    if (phase.atSeconds > elapsedSeconds) {
      break;
    }
    active = phase;
  }
  return active;
}

export function activeSpawnRules(
  timeline: readonly SpawnPhase[],
  elapsedSeconds: number,
): readonly SpawnRule[] {
  return activePhase(timeline, elapsedSeconds)?.spawns ?? [];
}

export interface SpawnerState {
  /** Seconds since each enemy type last spawned, by enemy name. */
  timers: Readonly<Record<string, number>>;
}

export interface SpawnerStep {
  state: SpawnerState;
  /** Rules whose group should spawn this frame. */
  due: SpawnRule[];
}

export function createSpawnerState(): SpawnerState {
  return { timers: {} };
}

/**
 * Advances one timer per active rule and reports which groups are due.
 *
 * An enemy type spawns as soon as it joins the timeline, then at its interval.
 * A type that carries on into the next phase keeps its timer, so a phase change
 * does not cause a gap or an extra group. At most one group per rule is due in
 * a frame.
 */
export function stepSpawner(
  state: SpawnerState,
  rules: readonly SpawnRule[],
  deltaSeconds: number,
): SpawnerStep {
  const timers: Record<string, number> = {};
  const due: SpawnRule[] = [];

  for (const rule of rules) {
    const elapsed = state.timers[rule.enemy];
    if (elapsed === undefined) {
      timers[rule.enemy] = 0;
      due.push(rule);
      continue;
    }
    const step = stepRepeatingTimer(elapsed, rule.intervalSeconds, deltaSeconds, 1);
    timers[rule.enemy] = step.elapsedSeconds;
    if (step.due > 0) {
      due.push(rule);
    }
  }

  return { state: { timers }, due };
}
