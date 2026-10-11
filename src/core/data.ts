import playerJson from '../data/player.json';
import tuningJson from '../data/tuning.json';

export const PLAYER_FILE = 'src/data/player.json';
export const TUNING_FILE = 'src/data/tuning.json';

export const PLAYER_SHAPES = ['square', 'circle', 'triangle'] as const;
export type PlayerShape = (typeof PLAYER_SHAPES)[number];

export interface PlayerConfig {
  shape: PlayerShape;
  /** Hex colour in the form "#rrggbb". */
  colour: string;
  /** Width and height of the shape in pixels. */
  size: number;
}

export interface Tuning {
  /** Player movement speed in pixels per second. */
  moveSpeed: number;
}

export interface GameData {
  player: PlayerConfig;
  tuning: Tuning;
}

/** Thrown when a data file fails validation; the message names the file and field. */
export class DataError extends Error {
  constructor(file: string, field: string, problem: string) {
    super(`${file}: "${field}" ${problem}`);
    this.name = 'DataError';
  }
}

const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;

function asRecord(file: string, raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new Error(`${file}: expected a JSON object, got ${JSON.stringify(raw)}`);
  }
  return raw as Record<string, unknown>;
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

export function parsePlayerConfig(raw: unknown): PlayerConfig {
  const record = asRecord(PLAYER_FILE, raw);

  const shape = record.shape;
  if (typeof shape !== 'string' || !PLAYER_SHAPES.includes(shape as PlayerShape)) {
    const allowed = PLAYER_SHAPES.map((s) => `"${s}"`).join(', ');
    throw new DataError(
      PLAYER_FILE,
      'shape',
      `must be one of ${allowed}, got ${JSON.stringify(shape)}`,
    );
  }

  const colour = record.colour;
  if (typeof colour !== 'string' || !HEX_COLOUR.test(colour)) {
    throw new DataError(
      PLAYER_FILE,
      'colour',
      `must be a hex colour like "#39e6ff", got ${JSON.stringify(colour)}`,
    );
  }

  return {
    shape: shape as PlayerShape,
    colour,
    size: positiveNumber(PLAYER_FILE, 'size', record.size),
  };
}

export function parseTuning(raw: unknown): Tuning {
  const record = asRecord(TUNING_FILE, raw);
  return { moveSpeed: positiveNumber(TUNING_FILE, 'moveSpeed', record.moveSpeed) };
}

/** Validates the bundled data files. Call once at startup. */
export function loadGameData(): GameData {
  return {
    player: parsePlayerConfig(playerJson),
    tuning: parseTuning(tuningJson),
  };
}
