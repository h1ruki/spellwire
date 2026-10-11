import { describe, expect, it } from 'vitest';
import {
  loadGameData,
  parseEnemies,
  parsePlayerConfig,
  parseTuning,
  PLAYER_SHAPES,
} from '../src/core/data';

const VALID_PLAYER = { shape: 'square', colour: '#39e6ff', size: 40 };

describe('parsePlayerConfig', () => {
  it('accepts valid data', () => {
    expect(parsePlayerConfig(VALID_PLAYER)).toEqual(VALID_PLAYER);
  });

  it.each(PLAYER_SHAPES)('accepts the "%s" shape', (shape) => {
    expect(parsePlayerConfig({ ...VALID_PLAYER, shape }).shape).toBe(shape);
  });

  it('rejects an unknown shape, naming the file and field', () => {
    expect(() => parsePlayerConfig({ ...VALID_PLAYER, shape: 'hexagon' })).toThrow(
      'src/data/player.json: "shape" must be one of "square", "circle", "triangle", got "hexagon"',
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
  spawn: { intervalSeconds: 2, groupSize: 3, minDistanceFromPlayer: 350 },
  caps: { maxProjectiles: 100, maxEnemies: 60 },
};

/** A copy of the valid tuning with one nested field replaced. */
function tuningWith(section: keyof typeof VALID_TUNING, field: string, value: unknown) {
  return { ...VALID_TUNING, [section]: { ...(VALID_TUNING[section] as object), [field]: value } };
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

  it.each([
    ['dash', 'distance'],
    ['dash', 'durationSeconds'],
    ['dash', 'cooldownSeconds'],
    ['fire', 'shotsPerSecond'],
    ['fire', 'projectileSpeed'],
    ['fire', 'projectileDamage'],
    ['player', 'maxHealth'],
    ['player', 'postHitInvulnerabilitySeconds'],
    ['spawn', 'intervalSeconds'],
    ['spawn', 'minDistanceFromPlayer'],
  ] as const)('rejects a bad number for %s.%s', (section, field) => {
    for (const bad of [0, -1, '3', null, undefined]) {
      expect(() => parseTuning(tuningWith(section, field, bad))).toThrow(
        `src/data/tuning.json: "${section}.${field}" must be a number greater than 0, got ${JSON.stringify(bad)}`,
      );
    }
  });

  it.each([
    ['spawn', 'groupSize'],
    ['caps', 'maxProjectiles'],
    ['caps', 'maxEnemies'],
  ] as const)('rejects a count that is not a positive whole number for %s.%s', (section, field) => {
    for (const bad of [0, -2, 2.5, '3', undefined]) {
      expect(() => parseTuning(tuningWith(section, field, bad))).toThrow(
        `src/data/tuning.json: "${section}.${field}" must be a whole number greater than 0, got ${JSON.stringify(bad)}`,
      );
    }
  });

  it.each(['dash', 'fire', 'player', 'spawn', 'caps'] as const)(
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
});

const VALID_SWARMER = {
  speed: 190,
  health: 10,
  contactDamage: 10,
  size: 26,
  colour: '#ff5a5f',
  shape: 'triangle',
};

describe('parseEnemies', () => {
  it('accepts valid data', () => {
    expect(parseEnemies({ swarmer: VALID_SWARMER })).toEqual({ swarmer: VALID_SWARMER });
  });

  it.each(['speed', 'health', 'contactDamage', 'size'])('rejects a bad swarmer %s', (field) => {
    for (const bad of [0, -5, 'fast', undefined]) {
      expect(() => parseEnemies({ swarmer: { ...VALID_SWARMER, [field]: bad } })).toThrow(
        `src/data/enemies.json: "swarmer.${field}" must be a number greater than 0, got ${JSON.stringify(bad)}`,
      );
    }
  });

  it('rejects a bad swarmer colour', () => {
    expect(() => parseEnemies({ swarmer: { ...VALID_SWARMER, colour: 'red' } })).toThrow(
      'src/data/enemies.json: "swarmer.colour" must be a hex colour like "#39e6ff", got "red"',
    );
  });

  it('rejects an unknown swarmer shape', () => {
    expect(() => parseEnemies({ swarmer: { ...VALID_SWARMER, shape: 'hexagon' } })).toThrow(
      'src/data/enemies.json: "swarmer.shape" must be one of "square", "circle", "triangle", got "hexagon"',
    );
  });

  it('rejects a missing swarmer entry', () => {
    expect(() => parseEnemies({})).toThrow(
      'src/data/enemies.json: "swarmer" must be an object, got undefined',
    );
  });

  it('rejects data that is not an object', () => {
    expect(() => parseEnemies(null)).toThrow('src/data/enemies.json: expected a JSON object');
  });
});

describe('loadGameData', () => {
  it('validates the data files shipped with the game', () => {
    const data = loadGameData();

    expect(PLAYER_SHAPES).toContain(data.player.shape);
    expect(data.tuning.moveSpeed).toBeGreaterThan(0);
    expect(data.enemies.swarmer.shape).toBe('triangle');
  });

  it('ships the locked M1 rule values', () => {
    const { tuning } = loadGameData();

    expect(tuning.dash.cooldownSeconds).toBe(1.5);
    expect(tuning.fire.shotsPerSecond).toBe(3);
    expect(tuning.player.maxHealth).toBe(100);
  });
});
