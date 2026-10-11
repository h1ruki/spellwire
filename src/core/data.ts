import boostsJson from '../data/boosts.json';
import enemiesJson from '../data/enemies.json';
import partsJson from '../data/parts.json';
import playerJson from '../data/player.json';
import spawnsJson from '../data/spawns.json';
import tuningJson from '../data/tuning.json';
import type { CrystalTier } from './crystals';
import type { DashTuning } from './dash';
import type { BurnSpec, Part, SlowSpec } from './loadout';
import type { SpawnPhase, SpawnRule } from './schedule';
import { BOOST_UNITS, STATS, type Boost, type BoostUnit, type Stat } from './stats';
import type { XpTuning } from './xp';

export const PLAYER_FILE = 'src/data/player.json';
export const TUNING_FILE = 'src/data/tuning.json';
export const ENEMIES_FILE = 'src/data/enemies.json';
export const SPAWNS_FILE = 'src/data/spawns.json';
export const PARTS_FILE = 'src/data/parts.json';
export const BOOSTS_FILE = 'src/data/boosts.json';

export const SHAPES = ['square', 'circle', 'triangle', 'hexagon'] as const;
export type Shape = (typeof SHAPES)[number];

export const PLAYER_SHAPES = SHAPES;
export type PlayerShape = Shape;

export interface PlayerConfig {
  shape: PlayerShape;
  /** Hex colour in the form "#rrggbb". */
  colour: string;
  /** Width and height of the shape in pixels. */
  size: number;
}

export interface FireTuning {
  shotsPerSecond: number;
  /** Pixels per second. */
  projectileSpeed: number;
  projectileDamage: number;
}

export interface PlayerHealthTuning {
  maxHealth: number;
  /** How long the player ignores damage after being hit. */
  postHitInvulnerabilitySeconds: number;
}

export interface SpawnTuning {
  /** Enemies never appear closer to the player than this, in pixels. */
  minDistanceFromPlayer: number;
}

export interface CapsTuning {
  maxProjectiles: number;
  maxEnemies: number;
}

export interface CrystalTuning {
  /** How fast a crystal flies to the player once in pickup range, in pixels per second. */
  attractSpeed: number;
  /** Most crystals on the field at once; further drops merge into existing crystals. */
  maxCrystals: number;
  /** Look by value, sorted by `minValue`; the first tier starts at 1. */
  tiers: CrystalTier[];
}

export interface HitFeedbackTuning {
  /** How long an enemy flashes when hit. */
  flashSeconds: number;
  /** How far a hit pushes an enemy with no knockback resistance, in pixels. */
  knockbackStrength: number;
  /** Screen shake when the player is hurt, in pixels; 0 turns it off. */
  shakeIntensity: number;
  shakeSeconds: number;
}

export interface BurnTuning {
  /** How often a burning enemy takes its burn damage. */
  tickIntervalSeconds: number;
}

export interface Tuning {
  /** Player movement speed in pixels per second. */
  moveSpeed: number;
  dash: DashTuning;
  fire: FireTuning;
  player: PlayerHealthTuning;
  spawn: SpawnTuning;
  caps: CapsTuning;
  xp: XpTuning;
  /** Crystals closer to the player than this fly to them, in pixels. */
  pickupRange: number;
  crystals: CrystalTuning;
  hitFeedback: HitFeedbackTuning;
  /** Health restored by skipping an upgrade offer, never above the maximum. */
  skipHeal: number;
  burn: BurnTuning;
}

export interface EnemyConfig {
  /** Pixels per second. */
  speed: number;
  health: number;
  /** Damage dealt to the player on touch. */
  contactDamage: number;
  /** Width and height of the shape in pixels. */
  size: number;
  /** Hex colour in the form "#rrggbb". */
  colour: string;
  shape: Shape;
  /** Value of the XP crystal dropped on death. */
  xp: number;
  /** From 0 (pushed the full distance by a hit) to 1 (not pushed at all). */
  knockbackResistance: number;
}

/** Enemy definitions by name, e.g. "swarmer". */
export type Enemies = Record<string, EnemyConfig>;

export interface GameData {
  player: PlayerConfig;
  tuning: Tuning;
  enemies: Enemies;
  /** Spawn timeline, sorted by start time. */
  spawns: SpawnPhase[];
  /** Weapon parts that can be offered, in file order. */
  parts: Part[];
  /** Stat boosts that can be offered, in file order. */
  boosts: Boost[];
}

/** Thrown when a data file fails validation; the message names the file and field. */
export class DataError extends Error {
  constructor(file: string, field: string, problem: string) {
    super(`${file}: "${field}" ${problem}`);
    this.name = 'DataError';
  }
}

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(file: string, raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    throw new Error(`${file}: expected a JSON object, got ${JSON.stringify(raw)}`);
  }
  return raw;
}

/** A nested object such as "dash" inside the tuning file. */
function section(
  file: string,
  parent: Record<string, unknown>,
  field: string,
): Record<string, unknown> {
  const value = parent[field];
  if (!isRecord(value)) {
    throw new DataError(file, field, `must be an object, got ${JSON.stringify(value)}`);
  }
  return value;
}

function positiveNumber(file: string, field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new DataError(
      file,
      field,
      `must be a number greater than 0, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function positiveInteger(file: string, field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new DataError(
      file,
      field,
      `must be a whole number greater than 0, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function nonNegativeNumber(file: string, field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new DataError(file, field, `must be a number of 0 or more, got ${JSON.stringify(value)}`);
  }
  return value;
}

function fraction(file: string, field: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new DataError(file, field, `must be a number from 0 to 1, got ${JSON.stringify(value)}`);
  }
  return value;
}

function atLeast(
  file: string,
  field: string,
  value: unknown,
  minimum: number,
  why: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new DataError(
      file,
      field,
      `must be a number of ${minimum} or more (${why}), got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

/** Validates crystal tiers: at least one, starting at 1, strictly ascending. */
export function parseCrystalTiers(file: string, field: string, raw: unknown): CrystalTier[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new DataError(
      file,
      field,
      `must be a list with at least one tier, got ${JSON.stringify(raw)}`,
    );
  }
  const tiers: CrystalTier[] = [];
  raw.forEach((entry: unknown, index) => {
    const at = `${field}[${index}]`;
    if (!isRecord(entry)) {
      throw new DataError(file, at, `must be an object, got ${JSON.stringify(entry)}`);
    }
    const minValue = positiveNumber(file, `${at}.minValue`, entry.minValue);
    const previous = tiers[index - 1];
    if (index === 0 && minValue !== 1) {
      throw new DataError(file, `${at}.minValue`, `must be 1 for the first tier, got ${minValue}`);
    }
    if (previous && minValue <= previous.minValue) {
      throw new DataError(
        file,
        `${at}.minValue`,
        `must be greater than the tier before it (${previous.minValue}), got ${minValue}`,
      );
    }
    tiers.push({
      minValue,
      colour: hexColour(file, `${at}.colour`, entry.colour),
      size: positiveNumber(file, `${at}.size`, entry.size),
    });
  });
  return tiers;
}

function shape(file: string, field: string, value: unknown): Shape {
  if (typeof value !== 'string' || !SHAPES.includes(value as Shape)) {
    const allowed = SHAPES.map((s) => `"${s}"`).join(', ');
    throw new DataError(file, field, `must be one of ${allowed}, got ${JSON.stringify(value)}`);
  }
  return value as Shape;
}

function hexColour(file: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || !HEX_COLOUR.test(value)) {
    throw new DataError(
      file,
      field,
      `must be a hex colour like "#39e6ff", got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

export function parsePlayerConfig(raw: unknown): PlayerConfig {
  const record = asRecord(PLAYER_FILE, raw);
  return {
    shape: shape(PLAYER_FILE, 'shape', record.shape),
    colour: hexColour(PLAYER_FILE, 'colour', record.colour),
    size: positiveNumber(PLAYER_FILE, 'size', record.size),
  };
}

export function parseTuning(raw: unknown): Tuning {
  const file = TUNING_FILE;
  const record = asRecord(file, raw);
  const moveSpeed = positiveNumber(file, 'moveSpeed', record.moveSpeed);

  const dash = section(file, record, 'dash');
  const fire = section(file, record, 'fire');
  const player = section(file, record, 'player');
  const spawn = section(file, record, 'spawn');
  const caps = section(file, record, 'caps');
  const xp = section(file, record, 'xp');
  const crystals = section(file, record, 'crystals');
  const hitFeedback = section(file, record, 'hitFeedback');
  const burn = section(file, record, 'burn');

  return {
    moveSpeed,
    dash: {
      distance: positiveNumber(file, 'dash.distance', dash.distance),
      durationSeconds: positiveNumber(file, 'dash.durationSeconds', dash.durationSeconds),
      cooldownSeconds: positiveNumber(file, 'dash.cooldownSeconds', dash.cooldownSeconds),
    },
    fire: {
      shotsPerSecond: positiveNumber(file, 'fire.shotsPerSecond', fire.shotsPerSecond),
      projectileSpeed: positiveNumber(file, 'fire.projectileSpeed', fire.projectileSpeed),
      projectileDamage: positiveNumber(file, 'fire.projectileDamage', fire.projectileDamage),
    },
    player: {
      maxHealth: positiveNumber(file, 'player.maxHealth', player.maxHealth),
      postHitInvulnerabilitySeconds: positiveNumber(
        file,
        'player.postHitInvulnerabilitySeconds',
        player.postHitInvulnerabilitySeconds,
      ),
    },
    spawn: {
      minDistanceFromPlayer: positiveNumber(
        file,
        'spawn.minDistanceFromPlayer',
        spawn.minDistanceFromPlayer,
      ),
    },
    caps: {
      maxProjectiles: positiveInteger(file, 'caps.maxProjectiles', caps.maxProjectiles),
      maxEnemies: positiveInteger(file, 'caps.maxEnemies', caps.maxEnemies),
    },
    xp: {
      firstLevelXp: positiveNumber(file, 'xp.firstLevelXp', xp.firstLevelXp),
      perLevelIncrease: nonNegativeNumber(file, 'xp.perLevelIncrease', xp.perLevelIncrease),
    },
    pickupRange: positiveNumber(file, 'pickupRange', record.pickupRange),
    crystals: {
      attractSpeed: positiveNumber(file, 'crystals.attractSpeed', crystals.attractSpeed),
      maxCrystals: positiveInteger(file, 'crystals.maxCrystals', crystals.maxCrystals),
      tiers: parseCrystalTiers(file, 'crystals.tiers', crystals.tiers),
    },
    hitFeedback: {
      flashSeconds: nonNegativeNumber(file, 'hitFeedback.flashSeconds', hitFeedback.flashSeconds),
      knockbackStrength: nonNegativeNumber(
        file,
        'hitFeedback.knockbackStrength',
        hitFeedback.knockbackStrength,
      ),
      shakeIntensity: nonNegativeNumber(
        file,
        'hitFeedback.shakeIntensity',
        hitFeedback.shakeIntensity,
      ),
      shakeSeconds: nonNegativeNumber(file, 'hitFeedback.shakeSeconds', hitFeedback.shakeSeconds),
    },
    skipHeal: positiveNumber(file, 'skipHeal', record.skipHeal),
    burn: {
      tickIntervalSeconds: positiveNumber(
        file,
        'burn.tickIntervalSeconds',
        burn.tickIntervalSeconds,
      ),
    },
  };
}

function parseEnemy(name: string, raw: Record<string, unknown>): EnemyConfig {
  const file = ENEMIES_FILE;
  return {
    speed: positiveNumber(file, `${name}.speed`, raw.speed),
    health: positiveNumber(file, `${name}.health`, raw.health),
    contactDamage: positiveNumber(file, `${name}.contactDamage`, raw.contactDamage),
    size: positiveNumber(file, `${name}.size`, raw.size),
    colour: hexColour(file, `${name}.colour`, raw.colour),
    shape: shape(file, `${name}.shape`, raw.shape),
    xp: positiveNumber(file, `${name}.xp`, raw.xp),
    knockbackResistance: fraction(file, `${name}.knockbackResistance`, raw.knockbackResistance),
  };
}

export function parseEnemies(raw: unknown): Enemies {
  const record = asRecord(ENEMIES_FILE, raw);
  const names = Object.keys(record);
  if (names.length === 0) {
    throw new Error(`${ENEMIES_FILE}: must define at least one enemy`);
  }
  const enemies: Enemies = {};
  for (const name of names) {
    enemies[name] = parseEnemy(name, section(ENEMIES_FILE, record, name));
  }
  return enemies;
}

function parseSpawnRule(field: string, raw: unknown, enemyNames: readonly string[]): SpawnRule {
  const file = SPAWNS_FILE;
  if (!isRecord(raw)) {
    throw new DataError(file, field, `must be an object, got ${JSON.stringify(raw)}`);
  }
  const enemy = raw.enemy;
  if (typeof enemy !== 'string' || !enemyNames.includes(enemy)) {
    const known = enemyNames.map((name) => `"${name}"`).join(', ');
    throw new DataError(
      file,
      `${field}.enemy`,
      `must be an enemy from ${ENEMIES_FILE} (${known}), got ${JSON.stringify(enemy)}`,
    );
  }
  return {
    enemy,
    intervalSeconds: positiveNumber(file, `${field}.intervalSeconds`, raw.intervalSeconds),
    groupSize: positiveInteger(file, `${field}.groupSize`, raw.groupSize),
  };
}

/**
 * Validates the spawn timeline. Entries must be in order of `atSeconds` with no
 * two starting at the same time, and may only name enemies that exist.
 */
export function parseSpawnTimeline(raw: unknown, enemyNames: readonly string[]): SpawnPhase[] {
  const file = SPAWNS_FILE;
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`${file}: expected a list with at least one entry, got ${JSON.stringify(raw)}`);
  }

  const timeline: SpawnPhase[] = [];
  raw.forEach((entry: unknown, index) => {
    const field = `[${index}]`;
    if (!isRecord(entry)) {
      throw new DataError(file, field, `must be an object, got ${JSON.stringify(entry)}`);
    }

    const atSeconds = nonNegativeNumber(file, `${field}.atSeconds`, entry.atSeconds);
    const previous = timeline[index - 1];
    if (previous && atSeconds <= previous.atSeconds) {
      throw new DataError(
        file,
        `${field}.atSeconds`,
        `must be later than the entry before it (${previous.atSeconds}), got ${atSeconds}`,
      );
    }

    if (!Array.isArray(entry.spawns)) {
      throw new DataError(
        file,
        `${field}.spawns`,
        `must be a list, got ${JSON.stringify(entry.spawns)}`,
      );
    }
    const spawns = entry.spawns.map((rule: unknown, ruleIndex) =>
      parseSpawnRule(`${field}.spawns[${ruleIndex}]`, rule, enemyNames),
    );
    spawns.forEach((rule, ruleIndex) => {
      if (spawns.findIndex((other) => other.enemy === rule.enemy) !== ruleIndex) {
        throw new DataError(
          file,
          `${field}.spawns[${ruleIndex}].enemy`,
          `must not repeat an enemy within one entry, got "${rule.enemy}" twice`,
        );
      }
    });

    timeline.push({ atSeconds, spawns });
  });
  return timeline;
}

function text(file: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DataError(
      file,
      field,
      `must be text that is not empty, got ${JSON.stringify(value)}`,
    );
  }
  return value;
}

function oneOf<T extends string>(
  file: string,
  field: string,
  value: unknown,
  allowed: readonly T[],
): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    const list = allowed.map((option) => `"${option}"`).join(', ');
    throw new DataError(file, field, `must be one of ${list}, got ${JSON.stringify(value)}`);
  }
  return value as T;
}

/** A list of objects that each carry their own "id", e.g. the parts file. */
function entries(file: string, raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error(`${file}: expected a list with at least one entry, got ${JSON.stringify(raw)}`);
  }
  const seen: string[] = [];
  return raw.map((entry: unknown, index) => {
    if (!isRecord(entry)) {
      throw new DataError(file, `[${index}]`, `must be an object, got ${JSON.stringify(entry)}`);
    }
    const id = text(file, `[${index}].id`, entry.id);
    if (seen.includes(id)) {
      throw new DataError(
        file,
        `[${index}].id`,
        `must not repeat an earlier id, got "${id}" twice`,
      );
    }
    seen.push(id);
    return entry;
  });
}

/** An effect a part may leave out, such as "burn" on a part that does not burn. */
function optionalSection(
  file: string,
  field: string,
  value: unknown,
): Record<string, unknown> | null {
  if (value === undefined) {
    return null;
  }
  if (!isRecord(value)) {
    throw new DataError(file, field, `must be an object or left out, got ${JSON.stringify(value)}`);
  }
  return value;
}

function parseBurn(file: string, field: string, raw: unknown): BurnSpec | null {
  const burn = optionalSection(file, field, raw);
  return (
    burn && {
      durationSeconds: positiveNumber(file, `${field}.durationSeconds`, burn.durationSeconds),
      totalDamage: positiveNumber(file, `${field}.totalDamage`, burn.totalDamage),
    }
  );
}

function parseSlow(file: string, field: string, raw: unknown): SlowSpec | null {
  const slow = optionalSection(file, field, raw);
  if (!slow) {
    return null;
  }
  const percent = slow.percent;
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent <= 0 || percent > 100) {
    throw new DataError(
      file,
      `${field}.percent`,
      `must be a number above 0 and at most 100, got ${JSON.stringify(percent)}`,
    );
  }
  return {
    percent,
    durationSeconds: positiveNumber(file, `${field}.durationSeconds`, slow.durationSeconds),
  };
}

/**
 * Validates the weapon parts. Only payloads exist so far, so a part for the
 * trigger or modifier slot is rejected instead of being offered and doing
 * nothing. A payload never lowers direct damage below the plain shot's.
 */
export function parseParts(raw: unknown): Part[] {
  const file = PARTS_FILE;
  return entries(file, raw).map((entry, index) => {
    const at = `[${index}]`;
    return {
      id: text(file, `${at}.id`, entry.id),
      slot: oneOf(file, `${at}.slot`, entry.slot, ['payload'] as const),
      name: text(file, `${at}.name`, entry.name),
      description: text(file, `${at}.description`, entry.description),
      colour: hexColour(file, `${at}.colour`, entry.colour),
      damageMultiplier: atLeast(
        file,
        `${at}.damageMultiplier`,
        entry.damageMultiplier,
        1,
        'no payload hits softer than the plain shot',
      ),
      burn: parseBurn(file, `${at}.burn`, entry.burn),
      slow: parseSlow(file, `${at}.slow`, entry.slow),
    };
  });
}

export function parseBoosts(raw: unknown): Boost[] {
  const file = BOOSTS_FILE;
  return entries(file, raw).map((entry, index) => {
    const at = `[${index}]`;
    return {
      id: text(file, `${at}.id`, entry.id),
      stat: oneOf<Stat>(file, `${at}.stat`, entry.stat, STATS),
      name: text(file, `${at}.name`, entry.name),
      description: text(file, `${at}.description`, entry.description),
      amount: positiveNumber(file, `${at}.amount`, entry.amount),
      unit: oneOf<BoostUnit>(file, `${at}.unit`, entry.unit, BOOST_UNITS),
    };
  });
}

/** Validates the bundled data files. Call once at startup. */
export function loadGameData(): GameData {
  const enemies = parseEnemies(enemiesJson);
  return {
    player: parsePlayerConfig(playerJson),
    tuning: parseTuning(tuningJson),
    enemies,
    spawns: parseSpawnTimeline(spawnsJson, Object.keys(enemies)),
    parts: parseParts(partsJson),
    boosts: parseBoosts(boostsJson),
  };
}
