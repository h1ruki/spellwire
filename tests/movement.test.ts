import { describe, expect, it } from 'vitest';
import { clampToArena, movementDelta, type MoveInput } from '../src/core/movement';

const NONE: MoveInput = { up: false, down: false, left: false, right: false };
const SPEED = 300;
const DT = 0.5;
const DISTANCE = SPEED * DT;

describe('movementDelta', () => {
  it('does not move with no keys held', () => {
    expect(movementDelta(NONE, SPEED, DT)).toEqual({ x: 0, y: 0 });
  });

  it('moves up with W', () => {
    expect(movementDelta({ ...NONE, up: true }, SPEED, DT)).toEqual({ x: 0, y: -DISTANCE });
  });

  it('moves left with A', () => {
    expect(movementDelta({ ...NONE, left: true }, SPEED, DT)).toEqual({ x: -DISTANCE, y: 0 });
  });

  it('moves down with S', () => {
    expect(movementDelta({ ...NONE, down: true }, SPEED, DT)).toEqual({ x: 0, y: DISTANCE });
  });

  it('moves right with D', () => {
    expect(movementDelta({ ...NONE, right: true }, SPEED, DT)).toEqual({ x: DISTANCE, y: 0 });
  });

  it.each([
    ['W + D', { ...NONE, up: true, right: true }, 1, -1],
    ['W + A', { ...NONE, up: true, left: true }, -1, -1],
    ['S + D', { ...NONE, down: true, right: true }, 1, 1],
    ['S + A', { ...NONE, down: true, left: true }, -1, 1],
  ])('normalises the %s diagonal to the straight-line distance', (_name, input, signX, signY) => {
    const delta = movementDelta(input, SPEED, DT);

    expect(Math.hypot(delta.x, delta.y)).toBeCloseTo(DISTANCE);
    expect(Math.sign(delta.x)).toBe(signX);
    expect(Math.sign(delta.y)).toBe(signY);
    expect(Math.abs(delta.x)).toBeCloseTo(Math.abs(delta.y));
  });

  it('cancels opposite keys', () => {
    expect(movementDelta({ ...NONE, left: true, right: true }, SPEED, DT)).toEqual({ x: 0, y: 0 });
    expect(movementDelta({ ...NONE, up: true, down: true }, SPEED, DT)).toEqual({ x: 0, y: 0 });
  });

  it('moves straight when a third key cancels one axis', () => {
    const input = { up: true, down: false, left: true, right: true };
    expect(movementDelta(input, SPEED, DT)).toEqual({ x: 0, y: -DISTANCE });
  });

  it('does not move when no time has passed', () => {
    expect(movementDelta({ ...NONE, right: true }, SPEED, 0)).toEqual({ x: 0, y: 0 });
  });
});

describe('clampToArena', () => {
  const WIDTH = 1280;
  const HEIGHT = 720;
  const SIZE = 40;

  it('leaves a position inside the arena unchanged', () => {
    expect(clampToArena({ x: 640, y: 360 }, SIZE, WIDTH, HEIGHT)).toEqual({ x: 640, y: 360 });
  });

  it('stops the body at the left and top edges', () => {
    expect(clampToArena({ x: -50, y: -50 }, SIZE, WIDTH, HEIGHT)).toEqual({ x: 20, y: 20 });
  });

  it('stops the body at the right and bottom edges', () => {
    expect(clampToArena({ x: 5000, y: 5000 }, SIZE, WIDTH, HEIGHT)).toEqual({ x: 1260, y: 700 });
  });
});
