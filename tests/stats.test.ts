import { describe, expect, it } from 'vitest';
import { baseStats, effectiveStats, type Boost } from '../src/core/stats';
import { base, boost, shipped } from './shipped';

describe('baseStats', () => {
  it('reads the starting values from the tuning', () => {
    expect(baseStats(shipped.tuning)).toEqual({
      fireRate: shipped.tuning.fire.shotsPerSecond,
      damage: shipped.tuning.fire.projectileDamage,
      moveSpeed: shipped.tuning.moveSpeed,
      maxHealth: shipped.tuning.player.maxHealth,
      pickupRange: shipped.tuning.pickupRange,
    });
  });
});

describe('effectiveStats', () => {
  it('equals the base values with no boosts', () => {
    expect(effectiveStats(base, [])).toEqual(base);
  });

  it('applies each shipped boost to its own stat only', () => {
    expect(effectiveStats(base, [boost('fire-rate')]).fireRate).toBeCloseTo(base.fireRate * 1.1);
    expect(effectiveStats(base, [boost('damage')]).damage).toBeCloseTo(base.damage * 1.1);
    expect(effectiveStats(base, [boost('move-speed')]).moveSpeed).toBeCloseTo(
      base.moveSpeed * 1.08,
    );
    expect(effectiveStats(base, [boost('max-health')]).maxHealth).toBe(base.maxHealth + 20);
    expect(effectiveStats(base, [boost('pickup-range')]).pickupRange).toBeCloseTo(
      base.pickupRange * 1.25,
    );

    const onlyFireRate = effectiveStats(base, [boost('fire-rate')]);
    expect({ ...onlyFireRate, fireRate: base.fireRate }).toEqual(base);
  });

  it('stacks picks of the same boost additively: two +10% give +20%', () => {
    const twice = effectiveStats(base, [boost('fire-rate'), boost('fire-rate')]);
    expect(twice.fireRate).toBeCloseTo(base.fireRate * 1.2);
    expect(twice.fireRate).not.toBeCloseTo(base.fireRate * 1.21);
  });

  it('stacks flat boosts and has no cap', () => {
    const many = effectiveStats(base, Array<Boost>(10).fill(boost('max-health')));
    expect(many.maxHealth).toBe(base.maxHealth + 200);
  });

  it('combines boosts of different stats', () => {
    const stats = effectiveStats(base, [boost('damage'), boost('move-speed'), boost('damage')]);
    expect(stats.damage).toBeCloseTo(base.damage * 1.2);
    expect(stats.moveSpeed).toBeCloseTo(base.moveSpeed * 1.08);
    expect(stats.fireRate).toBe(base.fireRate);
  });

  it('applies percentages to the base value, then adds flat amounts', () => {
    const percent: Boost = { ...boost('max-health'), amount: 50, unit: 'percent' };
    const stats = effectiveStats(base, [boost('max-health'), percent]);
    expect(stats.maxHealth).toBe(base.maxHealth * 1.5 + 20);
  });
});
