import { describe, expect, it } from 'vitest';
import { createRng, pickDistinct, randomIndex } from '../src/core/rng';

const draw = (seed: number, count: number) => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng());
};

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    expect(draw(1234, 20)).toEqual(draw(1234, 20));
  });

  it('gives a different sequence for a different seed', () => {
    expect(draw(1, 5)).not.toEqual(draw(2, 5));
  });

  it('stays in the range from 0 up to, but not including, 1', () => {
    for (const value of draw(99, 2000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('spreads its values instead of repeating one', () => {
    const values = draw(7, 1000);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(new Set(values).size).toBeGreaterThan(990);
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});

describe('randomIndex', () => {
  it('reaches every index and none outside', () => {
    const rng = createRng(5);
    const seen = new Set(Array.from({ length: 500 }, () => randomIndex(rng, 4)));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  it('stays in range even if the generator returns exactly 1', () => {
    expect(randomIndex(() => 1, 3)).toBe(2);
  });
});

describe('pickDistinct', () => {
  const items = ['a', 'b', 'c', 'd', 'e'];

  it('never picks the same item twice', () => {
    for (let seed = 0; seed < 100; seed++) {
      const picked = pickDistinct(items, 3, createRng(seed));
      expect(picked).toHaveLength(3);
      expect(new Set(picked).size).toBe(3);
    }
  });

  it('returns everything when asked for more than there is', () => {
    expect(pickDistinct(items, 9, createRng(1)).sort()).toEqual(items);
    expect(pickDistinct([], 2, createRng(1))).toEqual([]);
  });

  it('picks nothing when asked for none, and leaves the list alone', () => {
    expect(pickDistinct(items, 0, createRng(1))).toEqual([]);
    expect(items).toHaveLength(5);
  });

  it('is reproducible with a seed', () => {
    expect(pickDistinct(items, 3, createRng(42))).toEqual(pickDistinct(items, 3, createRng(42)));
  });
});
