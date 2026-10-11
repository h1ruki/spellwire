import enemiesJson from '../data/enemies.json';
import playerJson from '../data/player.json';
import tuningJson from '../data/tuning.json';
import type { DashTuning } from './dash';

export const PLAYER_FILE = 'src/data/player.json';
export const TUNING_FILE = 'src/data/tuning.json';
export const ENEMIES_FILE = 'src/data/enemies.json';

export const SHAPES = ['square', 'circle', 'triangle'] as const;
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
  /** Time between enemy groups. */
  intervalSeconds: number;
  /** Enemies per group. */
  groupSize: number;
  /** Enemies never appear closer to the player than this, in pixels. */
  minDistanceFromPlayer: number;
}

export interface CapsTuning {
  maxProjectiles: number;
  maxEnemies: number;
}

export interface Tuning {
  /** Player movement speed in pixels per second. */
  moveSpeed: number;
  dash: DashTuning;
  fire: FireTuning;
  player: PlayerHealthTuning;
  spawn: SpawnTuning;
  caps: CapsTuning;
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
}

export interface Enemies {
  swarmer: EnemyConfig;
}

export interface GameData {
  player: PlayerConfig;
  tuning: Tuning;
  enemies: Enemies;
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
      intervalSeconds: positiveNumber(file, 'spawn.intervalSeconds', spawn.intervalSeconds),
      groupSize: positiveInteger(file, 'spawn.groupSize', spawn.groupSize),
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
  };
}

export function parseEnemies(raw: unknown): Enemies {
  const record = asRecord(ENEMIES_FILE, raw);
  return { swarmer: parseEnemy('swarmer', section(ENEMIES_FILE, record, 'swarmer')) };
}

/** Validates the bundled data files. Call once at startup. */
export function loadGameData(): GameData {
  return {
    player: parsePlayerConfig(playerJson),
    tuning: parseTuning(tuningJson),
    enemies: parseEnemies(enemiesJson),
  };
}
