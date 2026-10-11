import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/core/data';
import {
  activePhase,
  activeSpawnRules,
  createSpawnerState,
  stepSpawner,
  type SpawnPhase,
  type SpawnRule,
} from '../src/core/schedule';

const SWARMERS: SpawnRule = { enemy: 'swarmer', intervalSeconds: 2, groupSize: 3 };
const MORE_SWARMERS: SpawnRule = { enemy: 'swarmer', intervalSeconds: 1, groupSize: 4 };
const BRUTES: SpawnRule = { enemy: 'brute', intervalSeconds: 8, groupSize: 1 };

const TIMELINE: SpawnPhase[] = [
  { atSeconds: 0, spawns: [SWARMERS] },
  { atSeconds: 60, spawns: [MORE_SWARMERS] },
  { atSeconds: 120, spawns: [MORE_SWARMERS, BRUTES] },
];

describe('activeSpawnRules', () => {
  it('returns the first phase from the start', () => {
    expect(activeSpawnRules(TIMELINE, 0)).toEqual([SWARMERS]);
  });

  it('keeps a phase until the next one starts', () => {
    expect(activeSpawnRules(TIMELINE, 30)).toEqual([SWARMERS]);
    expect(activeSpawnRules(TIMELINE, 59.99)).toEqual([SWARMERS]);
  });

  it('switches exactly at an entry', () => {
    expect(activeSpawnRules(TIMELINE, 60)).toEqual([MORE_SWARMERS]);
    expect(activeSpawnRules(TIMELINE, 120)).toEqual([MORE_SWARMERS, BRUTES]);
  });

  it('returns the phase between two later entries', () => {
    expect(activeSpawnRules(TIMELINE, 90)).toEqual([MORE_SWARMERS]);
  });

  it('continues the final phase unchanged after the last entry', () => {
    expect(activeSpawnRules(TIMELINE, 121)).toEqual([MORE_SWARMERS, BRUTES]);
    expect(activeSpawnRules(TIMELINE, 3600)).toEqual([MORE_SWARMERS, BRUTES]);
  });

  it('treats each entry as a complete snapshot, not an addition', () => {
    const bruteOnly: SpawnPhase[] = [
      { atSeconds: 0, spawns: [SWARMERS] },
      { atSeconds: 10, spawns: [BRUTES] },
    ];
    expect(activeSpawnRules(bruteOnly, 15)).toEqual([BRUTES]);
  });

  it('spawns nothing before the first entry starts', () => {
    const late: SpawnPhase[] = [{ atSeconds: 5, spawns: [SWARMERS] }];
    expect(activePhase(late, 4.9)).toBeNull();
    expect(activeSpawnRules(late, 4.9)).toEqual([]);
    expect(activeSpawnRules(late, 5)).toEqual([SWARMERS]);
  });
});

/** Runs the spawner over a stretch of the timeline and counts enemies spawned by name. */
function simulate(timeline: SpawnPhase[], fromSeconds: number, toSeconds: number, dt = 1 / 60) {
  let state = createSpawnerState();
  const spawned: Record<string, number> = {};
  const firstAt: Record<string, number> = {};
  for (let t = fromSeconds; t < toSeconds; t += dt) {
    const step = stepSpawner(state, activeSpawnRules(timeline, t), dt);
    state = step.state;
    for (const rule of step.due) {
      spawned[rule.enemy] = (spawned[rule.enemy] ?? 0) + rule.groupSize;
      firstAt[rule.enemy] ??= t;
    }
  }
  return { spawned, firstAt };
}

describe('stepSpawner', () => {
  it('spawns an enemy type as soon as it joins, then at its interval', () => {
    // Groups at 0, 2, 4, 6 and 8 s.
    const { spawned, firstAt } = simulate([{ atSeconds: 0, spawns: [SWARMERS] }], 0, 9);
    expect(firstAt.swarmer).toBe(0);
    expect(spawned.swarmer).toBe(5 * SWARMERS.groupSize);
  });

  it('runs a separate timer for each enemy type', () => {
    // 16.5 s of swarmers every 1 s (17 groups) and brutes every 8 s (3 groups).
    const { spawned } = simulate([{ atSeconds: 0, spawns: [MORE_SWARMERS, BRUTES] }], 0, 16.5);
    expect(spawned.swarmer).toBe(17 * MORE_SWARMERS.groupSize);
    expect(spawned.brute).toBe(3 * BRUTES.groupSize);
  });

  it('brings a new enemy type in at the moment its phase starts', () => {
    const { firstAt } = simulate(TIMELINE, 0, 130);
    expect(firstAt.brute).toBeGreaterThanOrEqual(120);
    expect(firstAt.brute).toBeLessThan(120.1);
  });

  it('does not add or skip a group for a type that carries on into the next phase', () => {
    const steady: SpawnPhase[] = [
      { atSeconds: 0, spawns: [SWARMERS] },
      { atSeconds: 5, spawns: [SWARMERS, BRUTES] },
    ];
    // Swarmer groups at 0, 2, 4, 6 and 8 s whether or not the phase changes at 5 s.
    expect(simulate(steady, 0, 9).spawned.swarmer).toBe(5 * SWARMERS.groupSize);
  });

  it('gets faster when a later phase shortens the interval', () => {
    const early = simulate(TIMELINE, 0, 60).spawned.swarmer ?? 0;
    const late = simulate(TIMELINE, 60, 120).spawned.swarmer ?? 0;
    expect(late).toBeGreaterThan(early * 2);
  });

  it('reports at most one group per rule after a long frame', () => {
    const state = stepSpawner(createSpawnerState(), [SWARMERS], 1 / 60).state;
    expect(stepSpawner(state, [SWARMERS], 30).due).toEqual([SWARMERS]);
  });

  it('spawns nothing with no active rules', () => {
    expect(stepSpawner(createSpawnerState(), [], 1).due).toEqual([]);
  });
});

/** Enemies per second asked for by a set of rules. */
const pressure = (rules: readonly SpawnRule[]): number =>
  rules.reduce((sum, rule) => sum + rule.groupSize / rule.intervalSeconds, 0);

describe('the shipped spawn timeline', () => {
  const { spawns } = loadGameData();
  const enemiesAt = (seconds: number) => activeSpawnRules(spawns, seconds).map((r) => r.enemy);

  it('trickles swarmers from the very start', () => {
    expect(spawns[0]?.atSeconds).toBe(0);
    expect(enemiesAt(0)).toEqual(['swarmer']);
  });

  it('has only swarmers before brutes join', () => {
    expect(enemiesAt(60)).toEqual(['swarmer']);
    expect(enemiesAt(100)).toEqual(['swarmer']);
  });

  it('adds brutes at about 2:00', () => {
    const joins = spawns.find((phase) => phase.spawns.some((rule) => rule.enemy === 'brute'));
    expect(joins?.atSeconds).toBeGreaterThanOrEqual(110);
    expect(joins?.atSeconds).toBeLessThanOrEqual(130);
  });

  it('has both swarmers and brutes active after brutes join', () => {
    for (const seconds of [130, 180, 240, 280, 400, 3600]) {
      expect(enemiesAt(seconds)).toContain('swarmer');
      expect(enemiesAt(seconds)).toContain('brute');
    }
  });

  it('increases the pressure step by step up to the wave at about 4:30', () => {
    const upToWave = spawns.filter((phase) => phase.atSeconds <= 270);
    for (let i = 1; i < upToWave.length; i++) {
      const before = upToWave[i - 1];
      const after = upToWave[i];
      if (!before || !after) continue;
      expect(pressure(after.spawns)).toBeGreaterThan(pressure(before.spawns));
    }
  });

  it('has its heaviest phase at about 4:30', () => {
    const heaviest = spawns.reduce((a, b) => (pressure(b.spawns) > pressure(a.spawns) ? b : a));
    expect(heaviest.atSeconds).toBeGreaterThanOrEqual(260);
    expect(heaviest.atSeconds).toBeLessThanOrEqual(280);
  });

  it('spawns both swarmers and brutes when run from 2:00', () => {
    const { spawned } = simulate(spawns, 120, 150);
    expect(spawned.swarmer).toBeGreaterThan(0);
    expect(spawned.brute).toBeGreaterThan(0);
  });
});
