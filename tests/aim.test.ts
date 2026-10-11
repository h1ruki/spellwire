import { describe, expect, it } from 'vitest';
import { aimDirection, DEFAULT_AIM } from '../src/core/aim';

const PLAYER = { x: 640, y: 360 };

describe('aimDirection', () => {
  it.each([
    ['right', { x: 900, y: 360 }, { x: 1, y: 0 }],
    ['left', { x: 10, y: 360 }, { x: -1, y: 0 }],
    ['up', { x: 640, y: 0 }, { x: 0, y: -1 }],
    ['down', { x: 640, y: 700 }, { x: 0, y: 1 }],
  ])('points %s towards the cursor', (_name, cursor, expected) => {
    const aim = aimDirection(PLAYER, cursor, DEFAULT_AIM);
    expect(aim.x).toBeCloseTo(expected.x);
    expect(aim.y).toBeCloseTo(expected.y);
  });

  it.each([
    { x: 643, y: 364 },
    { x: 1280, y: 0 },
    { x: 0, y: 720 },
  ])('is normalised whatever the distance to the cursor ($x, $y)', (cursor) => {
    const aim = aimDirection(PLAYER, cursor, DEFAULT_AIM);
    expect(Math.hypot(aim.x, aim.y)).toBeCloseTo(1);
  });

  it('points along the diagonal', () => {
    const aim = aimDirection(PLAYER, { x: 740, y: 260 }, DEFAULT_AIM);
    expect(aim.x).toBeCloseTo(Math.SQRT1_2);
    expect(aim.y).toBeCloseTo(-Math.SQRT1_2);
  });

  it('keeps the last aim when the cursor is on the player', () => {
    const last = { x: 0, y: -1 };
    expect(aimDirection(PLAYER, { ...PLAYER }, last)).toBe(last);
    expect(aimDirection(PLAYER, { x: 640.4, y: 360.3 }, last)).toBe(last);
  });

  it('starts out aiming right', () => {
    expect(DEFAULT_AIM).toEqual({ x: 1, y: 0 });
  });
});
