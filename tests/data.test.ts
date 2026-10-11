import { describe, expect, it } from 'vitest';
import { loadGameData, parsePlayerConfig, parseTuning, PLAYER_SHAPES } from '../src/core/data';

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

describe('parseTuning', () => {
  it('accepts valid data', () => {
    expect(parseTuning({ moveSpeed: 320 })).toEqual({ moveSpeed: 320 });
  });

  it('rejects a negative move speed, naming the file and field', () => {
    expect(() => parseTuning({ moveSpeed: -5 })).toThrow(
      'src/data/tuning.json: "moveSpeed" must be a number greater than 0, got -5',
    );
  });

  it.each([0, '320', undefined])('rejects the move speed %j', (moveSpeed) => {
    expect(() => parseTuning({ moveSpeed })).toThrow(
      'src/data/tuning.json: "moveSpeed" must be a number greater than 0',
    );
  });
});

describe('loadGameData', () => {
  it('validates the data files shipped with the game', () => {
    const data = loadGameData();

    expect(PLAYER_SHAPES).toContain(data.player.shape);
    expect(data.tuning.moveSpeed).toBeGreaterThan(0);
  });
});
