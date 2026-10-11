import { describe, expect, it } from 'vitest';
import {
  loadGameData,
  parseEnemies,
  parsePlayerConfig,
  parseSpawnTimeline,
  parseTuning,
  PLAYER_SHAPES,
} from '../src/core/data';

const SHAPE_LIST = '"square", "circle", "triangle", "hexagon"';
const VALID_PLAYER = { shape: 'square', colour: '#39e6ff', size: 40 };

describe('parsePlayerConfig', () => {
  it('accepts valid data', () => {
    expect(parsePlayerConfig(VALID_PLAYER)).toEqual(VALID_PLAYER);
  });

  it.each(PLAYER_SHAPES)('accepts the "%s" shape', (shape) => {
    expect(parsePlayerConfig({ ...VALID_PLAYER, shape }).shape).toBe(shape);
  });

  it('rejects an unknown shape, naming the file and field', () => {
    expect(() => parsePlayerConfig({ ...VALID_PLAYER, shape: 'star' })).toThrow(
      `src/data/player.json: "shape" must be one of ${SHAPE_LIST}, got "star"`,
    );
  });

  it('rejects a missing shape', () => {
    expect(() => parsePlayerConfig({ colour: '#39e6ff', size: 40 })).toThrow(
      'src/data/player.json: "shape" must be one of',
    );
  });

  it.each(['red', '#fff', '#39e6fg', '39e6ff', 0x39e6ff])('rejects the colour %j', (colour) => {
    expect(() => parsePlayerConfig({ ...VALID_PLAYER, colour })).toThrow(
      `src/data/player.json: "colour" must be a hex colour like "#39e6ff", got ${JSON.stringify(colour)}`,
    );
  });

  it.each([0, -40, '40', null])('rejects the size %j', (size) => {
    expect(() => parsePlayerConfig({ ...VALID_PLAYER, size })).toThrow(
      `src/data/player.json: "size" must be a number greater than 0, got ${JSON.stringify(size)}`,
    );
  });

  it('rejects data that is not an object', () => {
    expect(() => parsePlayerConfig([])).toThrow('src/data/player.json: expected a JSON object');
  });
});

const VALID_TUNING = {
  moveSpeed: 320,
  dash: { distance: 180, durationSeconds: 0.15, cooldownSeconds: 1.5 },
  fire: { shotsPerSecond: 3, projectileSpeed: 700, projectileDamage: 10 },
  player: { maxHealth: 100, postHitInvulnerabilitySeconds: 0.8 },
  spawn: { minDistanceFromPlayer: 350 },
  caps: { maxProjectiles: 100, maxEnemies: 60 },
  xp: { firstLevelXp: 20, perLevelIncrease: 10 },
  pickupRange: 120,
  crystals: { attractSpeed: 520, maxCrystals: 80 },
  hitFeedback: { flashSeconds: 0.08, knockbackStrength: 24, shakeIntensity: 5, shakeSeconds: 0.15 },
};

type TuningSection =
  'dash' | 'fire' | 'player' | 'spawn' | 'caps' | 'xp' | 'crystals' | 'hitFeedback';

/** A copy of the valid tuning with one nested field replaced. */
function tuningWith(section: TuningSection, field: string, value: unknown) {
  return { ...VALID_TUNING, [section]: { ...VALID_TUNING[section], [field]: value } };
}

describe('parseTuning', () => {
  it('accepts valid data', () => {
    expect(parseTuning(VALID_TUNING)).toEqual(VALID_TUNING);
  });

  it('rejects a negative move speed, naming the file and field', () => {
    expect(() => parseTuning({ ...VALID_TUNING, moveSpeed: -5 })).toThrow(
      'src/data/tuning.json: "moveSpeed" must be a number greater than 0, got -5',
    );
  });

  it.each([0, '320', undefined])('rejects the move speed %j', (moveSpeed) => {
    expect(() => parseTuning({ ...VALID_TUNING, moveSpeed })).toThrow(
      'src/data/tuning.json: "moveSpeed" must be a number greater than 0',
    );
  });

  it.each([0, -120, '120', undefined])('rejects the pickup range %j', (pickupRange) => {
    expect(() => parseTuning({ ...VALID_TUNING, pickupRange })).toThrow(
      `src/data/tuning.json: "pickupRange" must be a number greater than 0, got ${JSON.stringify(pickupRange)}`,
    );
  });

  it.each([
    ['dash', 'distance'],
    ['dash', 'durationSeconds'],
    ['dash', 'cooldownSeconds'],
    ['fire', 'shotsPerSecond'],
    ['fire', 'projectileSpeed'],
    ['fire', 'projectileDamage'],
    ['player', 'maxHealth'],
    ['player', 'postHitInvulnerabilitySeconds'],
    ['spawn', 'minDistanceFromPlayer'],
    ['xp', 'firstLevelXp'],
    ['crystals', 'attractSpeed'],
  ] as const)('rejects a bad number for %s.%s', (section, field) => {
    for (const bad of [0, -1, '3', null, undefined]) {
      expect(() => parseTuning(tuningWith(section, field, bad))).toThrow(
        `src/data/tuning.json: "${section}.${field}" must be a number greater than 0, got ${JSON.stringify(bad)}`,
      );
    }
  });

  it.each([
    ['caps', 'maxProjectiles'],
    ['caps', 'maxEnemies'],
    ['crystals', 'maxCrystals'],
  ] as const)('rejects a count that is not a positive whole number for %s.%s', (section, field) => {
    for (const bad of [0, -2, 2.5, '3', undefined]) {
      expect(() => parseTuning(tuningWith(section, field, bad))).toThrow(
        `src/data/tuning.json: "${section}.${field}" must be a whole number greater than 0, got ${JSON.stringify(bad)}`,
      );
    }
  });

  it.each([
    ['xp', 'perLevelIncrease'],
    ['hitFeedback', 'flashSeconds'],
    ['hitFeedback', 'knockbackStrength'],
    ['hitFeedback', 'shakeIntensity'],
    ['hitFeedback', 'shakeSeconds'],
  ] as const)('accepts 0 but rejects a negative or missing %s.%s', (section, field) => {
    expect(() => parseTuning(tuningWith(section, field, 0))).not.toThrow();
    for (const bad of [-0.1, '1', null, undefined]) {
      expect(() => parseTuning(tuningWith(section, field, bad))).toThrow(
        `src/data/tuning.json: "${section}.${field}" must be a number of 0 or more, got ${JSON.stringify(bad)}`,
      );
    }
  });

  it.each(['dash', 'fire', 'player', 'spawn', 'caps', 'xp', 'crystals', 'hitFeedback'] as const)(
    'rejects a missing "%s" section',
    (section) => {
      const withoutSection = { ...VALID_TUNING, [section]: undefined };
      expect(() => parseTuning(withoutSection)).toThrow(
        `src/data/tuning.json: "${section}" must be an object, got undefined`,
      );
    },
  );

  it('rejects a section that is not an object', () => {
    expect(() => parseTuning({ ...VALID_TUNING, dash: 5 })).toThrow(
      'src/data/tuning.json: "dash" must be an object, got 5',
    );
  });

  it('no longer reads the spawn interval and group size, which moved to the timeline', () => {
    const tuning = parseTuning(tuningWith('spawn', 'intervalSeconds', -1));
    expect(tuning.spawn).toEqual({ minDistanceFromPlayer: 350 });
  });
});

const VALID_SWARMER = {
  speed: 190,
  health: 10,
  contactDamage: 10,
  size: 26,
  colour: '#ff5a5f',
  shape: 'triangle',
  xp: 1,
  knockbackResistance: 0,
};

const VALID_BRUTE = {
  speed: 70,
  health: 60,
  contactDamage: 25,
  size: 52,
  colour: '#a56bff',
  shape: 'hexagon',
  xp: 1,
  knockbackResistance: 0.75,
};

describe('parseEnemies', () => {
  it('accepts valid data with several enemies', () => {
    const enemies = { swarmer: VALID_SWARMER, brute: VALID_BRUTE };
    expect(parseEnemies(enemies)).toEqual(enemies);
  });

  it.each(['speed', 'health', 'contactDamage', 'size', 'xp'])(
    'rejects a bad swarmer %s',
    (field) => {
      for (const bad of [0, -5, 'fast', undefined]) {
        expect(() => parseEnemies({ swarmer: { ...VALID_SWARMER, [field]: bad } })).toThrow(
          `src/data/enemies.json: "swarmer.${field}" must be a number greater than 0, got ${JSON.stringify(bad)}`,
        );
      }
    },
  );

  it.each([0, 0.5, 1])('accepts a knockback resistance of %d', (knockbackResistance) => {
    const parsed = parseEnemies({ brute: { ...VALID_BRUTE, knockbackResistance } });
    expect(parsed.brute?.knockbackResistance).toBe(knockbackResistance);
  });

  it.each([-0.1, 1.5, 'high', undefined])('rejects the knockback resistance %j', (bad) => {
    expect(() => parseEnemies({ brute: { ...VALID_BRUTE, knockbackResistance: bad } })).toThrow(
      `src/data/enemies.json: "brute.knockbackResistance" must be a number from 0 to 1, got ${JSON.stringify(bad)}`,
    );
  });

  it('names the enemy whose field is wrong', () => {
    expect(() =>
      parseEnemies({ swarmer: VALID_SWARMER, brute: { ...VALID_BRUTE, health: -1 } }),
    ).toThrow('src/data/enemies.json: "brute.health" must be a number greater than 0, got -1');
  });

  it('rejects a bad swarmer colour', () => {
    expect(() => parseEnemies({ swarmer: { ...VALID_SWARMER, colour: 'red' } })).toThrow(
      'src/data/enemies.json: "swarmer.colour" must be a hex colour like "#39e6ff", got "red"',
    );
  });

  it('accepts the hexagon shape', () => {
    expect(parseEnemies({ brute: VALID_BRUTE }).brute?.shape).toBe('hexagon');
  });

  it('rejects an unknown shape', () => {
    expect(() => parseEnemies({ swarmer: { ...VALID_SWARMER, shape: 'star' } })).toThrow(
      `src/data/enemies.json: "swarmer.shape" must be one of ${SHAPE_LIST}, got "star"`,
    );
  });

  it('rejects an enemy that is not an object', () => {
    expect(() => parseEnemies({ swarmer: 7 })).toThrow(
      'src/data/enemies.json: "swarmer" must be an object, got 7',
    );
  });

  it('rejects a file with no enemies', () => {
    expect(() => parseEnemies({})).toThrow('src/data/enemies.json: must define at least one enemy');
  });

  it('rejects data that is not an object', () => {
    expect(() => parseEnemies(null)).toThrow('src/data/enemies.json: expected a JSON object');
  });
});

const ENEMY_NAMES = ['swarmer', 'brute'];
const SWARMERS = { enemy: 'swarmer', intervalSeconds: 2, groupSize: 3 };
const BRUTES = { enemy: 'brute', intervalSeconds: 8, groupSize: 1 };
const VALID_TIMELINE = [
  { atSeconds: 0, spawns: [SWARMERS] },
  { atSeconds: 120, spawns: [SWARMERS, BRUTES] },
];

describe('parseSpawnTimeline', () => {
  it('accepts a valid timeline', () => {
    expect(parseSpawnTimeline(VALID_TIMELINE, ENEMY_NAMES)).toEqual(VALID_TIMELINE);
  });

  it('accepts an entry that spawns nothing', () => {
    const timeline = [...VALID_TIMELINE, { atSeconds: 200, spawns: [] }];
    expect(parseSpawnTimeline(timeline, ENEMY_NAMES)).toEqual(timeline);
  });

  it('rejects entries that are out of order', () => {
    const unsorted = [
      { atSeconds: 0, spawns: [SWARMERS] },
      { atSeconds: 120, spawns: [SWARMERS] },
      { atSeconds: 60, spawns: [SWARMERS] },
    ];
    expect(() => parseSpawnTimeline(unsorted, ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: "[2].atSeconds" must be later than the entry before it (120), got 60',
    );
  });

  it('rejects two entries that start at the same time', () => {
    const duplicate = [
      { atSeconds: 0, spawns: [SWARMERS] },
      { atSeconds: 30, spawns: [SWARMERS] },
      { atSeconds: 30, spawns: [SWARMERS, BRUTES] },
    ];
    expect(() => parseSpawnTimeline(duplicate, ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: "[2].atSeconds" must be later than the entry before it (30), got 30',
    );
  });

  it('rejects an enemy that is not in the enemies file', () => {
    const unknown = [{ atSeconds: 0, spawns: [SWARMERS, { ...BRUTES, enemy: 'brut' }] }];
    expect(() => parseSpawnTimeline(unknown, ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: "[0].spawns[1].enemy" must be an enemy from src/data/enemies.json ("swarmer", "brute"), got "brut"',
    );
  });

  it('rejects the same enemy listed twice in one entry', () => {
    const repeated = [{ atSeconds: 0, spawns: [SWARMERS, SWARMERS] }];
    expect(() => parseSpawnTimeline(repeated, ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: "[0].spawns[1].enemy" must not repeat an enemy within one entry, got "swarmer" twice',
    );
  });

  it.each([-1, '0', undefined])('rejects the start time %j', (atSeconds) => {
    expect(() => parseSpawnTimeline([{ atSeconds, spawns: [SWARMERS] }], ENEMY_NAMES)).toThrow(
      `src/data/spawns.json: "[0].atSeconds" must be a number of 0 or more, got ${JSON.stringify(atSeconds)}`,
    );
  });

  it.each([0, -2, '2', undefined])('rejects the interval %j', (intervalSeconds) => {
    const timeline = [{ atSeconds: 0, spawns: [{ ...SWARMERS, intervalSeconds }] }];
    expect(() => parseSpawnTimeline(timeline, ENEMY_NAMES)).toThrow(
      `src/data/spawns.json: "[0].spawns[0].intervalSeconds" must be a number greater than 0, got ${JSON.stringify(intervalSeconds)}`,
    );
  });

  it.each([0, 1.5, -3, undefined])('rejects the group size %j', (groupSize) => {
    const timeline = [{ atSeconds: 0, spawns: [{ ...SWARMERS, groupSize }] }];
    expect(() => parseSpawnTimeline(timeline, ENEMY_NAMES)).toThrow(
      `src/data/spawns.json: "[0].spawns[0].groupSize" must be a whole number greater than 0, got ${JSON.stringify(groupSize)}`,
    );
  });

  it('rejects an entry without a spawns list', () => {
    expect(() => parseSpawnTimeline([{ atSeconds: 0 }], ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: "[0].spawns" must be a list, got undefined',
    );
  });

  it('rejects an entry or rule that is not an object', () => {
    expect(() => parseSpawnTimeline([5], ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: "[0]" must be an object, got 5',
    );
    expect(() => parseSpawnTimeline([{ atSeconds: 0, spawns: ['swarmer'] }], ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: "[0].spawns[0]" must be an object, got "swarmer"',
    );
  });

  it('rejects an empty timeline or one that is not a list', () => {
    expect(() => parseSpawnTimeline([], ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: expected a list with at least one entry',
    );
    expect(() => parseSpawnTimeline({}, ENEMY_NAMES)).toThrow(
      'src/data/spawns.json: expected a list with at least one entry',
    );
  });
});

describe('loadGameData', () => {
  it('validates the data files shipped with the game', () => {
    const data = loadGameData();

    expect(PLAYER_SHAPES).toContain(data.player.shape);
    expect(data.tuning.moveSpeed).toBeGreaterThan(0);
    expect(data.enemies.swarmer?.shape).toBe('triangle');
    expect(data.enemies.brute?.shape).toBe('hexagon');
    expect(data.spawns.length).toBeGreaterThan(0);
  });

  it('ships the locked rule values', () => {
    const { tuning, enemies } = loadGameData();

    expect(tuning.dash.cooldownSeconds).toBe(1.5);
    expect(tuning.fire.shotsPerSecond).toBe(3);
    expect(tuning.player.maxHealth).toBe(100);
    expect(enemies.swarmer?.xp).toBe(1);
    expect(enemies.brute?.xp).toBe(1);
  });

  it('ships a brute that is slower, tougher and harder-hitting than a swarmer', () => {
    const { swarmer, brute } = loadGameData().enemies;
    if (!swarmer || !brute) {
      throw new Error('swarmer and brute must both be defined');
    }

    expect(brute.speed).toBeLessThan(swarmer.speed);
    expect(brute.health).toBeGreaterThan(swarmer.health);
    expect(brute.contactDamage).toBeGreaterThan(swarmer.contactDamage);
    expect(brute.knockbackResistance).toBeGreaterThan(swarmer.knockbackResistance);
  });
});
