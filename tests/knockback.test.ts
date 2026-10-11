import { describe, expect, it } from 'vitest';
import { knockbackDisplacement } from '../src/core/knockback';

const STRENGTH = 24;

describe('knockbackDisplacement', () => {
  it('pushes the full distance with zero resistance', () => {
    const push = knockbackDisplacement({ x: 1, y: 0 }, STRENGTH, 0);
    expect(push.x).toBeCloseTo(STRENGTH);
    expect(push.y).toBeCloseTo(0);
  });

  it('pushes part of the distance with partial resistance', () => {
    const push = knockbackDisplacement({ x: 1, y: 0 }, STRENGTH, 0.75);
    expect(push.x).toBeCloseTo(6);
    expect(push.y).toBeCloseTo(0);
  });

  it('does not push at all with full resistance', () => {
    const push = knockbackDisplacement({ x: 1, y: 0 }, STRENGTH, 1);
    expect(push.x).toBeCloseTo(0);
    expect(push.y).toBeCloseTo(0);
  });

  it('pushes along the direction the projectile was travelling', () => {
    const push = knockbackDisplacement({ x: 0, y: -1 }, STRENGTH, 0);
    expect(push.x).toBeCloseTo(0);
    expect(push.y).toBeCloseTo(-STRENGTH);

    const diagonal = knockbackDisplacement({ x: -1, y: 1 }, STRENGTH, 0.5);
    expect(diagonal.x).toBeCloseTo(-12 * Math.SQRT1_2);
    expect(diagonal.y).toBeCloseTo(12 * Math.SQRT1_2);
  });

  it('depends on the direction of the hit, not its speed', () => {
    const slow = knockbackDisplacement({ x: 3, y: 4 }, STRENGTH, 0);
    const fast = knockbackDisplacement({ x: 300, y: 400 }, STRENGTH, 0);
    expect(Math.hypot(slow.x, slow.y)).toBeCloseTo(STRENGTH);
    expect(fast.x).toBeCloseTo(slow.x);
    expect(fast.y).toBeCloseTo(slow.y);
  });

  it('does not push with zero strength', () => {
    const push = knockbackDisplacement({ x: 1, y: 0 }, 0, 0);
    expect(Math.hypot(push.x, push.y)).toBe(0);
  });

  it('treats resistance outside 0 to 1 as the nearest limit', () => {
    expect(knockbackDisplacement({ x: 1, y: 0 }, STRENGTH, -2).x).toBeCloseTo(STRENGTH);
    expect(knockbackDisplacement({ x: 1, y: 0 }, STRENGTH, 5).x).toBeCloseTo(0);
  });

  it('does not push when the hit has no direction', () => {
    expect(knockbackDisplacement({ x: 0, y: 0 }, STRENGTH, 0)).toEqual({ x: 0, y: 0 });
  });
});
