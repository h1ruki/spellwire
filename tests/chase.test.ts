import { describe, expect, it } from 'vitest';
import { chaseVelocity } from '../src/core/chase';

const SPEED = 190;

describe('chaseVelocity', () => {
  it.each([
    ['right', { x: 500, y: 100 }, { x: SPEED, y: 0 }],
    ['left', { x: -500, y: 100 }, { x: -SPEED, y: 0 }],
    ['down', { x: 100, y: 900 }, { x: 0, y: SPEED }],
    ['up', { x: 100, y: -900 }, { x: 0, y: -SPEED }],
  ])('heads %s towards the player', (_name, player, expected) => {
    const velocity = chaseVelocity({ x: 100, y: 100 }, player, SPEED);
    expect(velocity.x).toBeCloseTo(expected.x);
    expect(velocity.y).toBeCloseTo(expected.y);
  });

  it('moves at its speed whatever the distance or angle', () => {
    for (const player of [
      { x: 101, y: 102 },
      { x: 1280, y: 720 },
      { x: -40, y: 333 },
    ]) {
      const velocity = chaseVelocity({ x: 100, y: 100 }, player, SPEED);
      expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(SPEED);
    }
  });

  it('points straight at the player', () => {
    const velocity = chaseVelocity({ x: 0, y: 0 }, { x: 300, y: 400 }, 100);
    expect(velocity.x).toBeCloseTo(60);
    expect(velocity.y).toBeCloseTo(80);
  });

  it('stands still when it is exactly on the player', () => {
    expect(chaseVelocity({ x: 5, y: 5 }, { x: 5, y: 5 }, SPEED)).toEqual({ x: 0, y: 0 });
  });
});
