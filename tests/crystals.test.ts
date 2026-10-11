import { describe, expect, it } from 'vitest';
import { crystalTierIndex, crystalVelocity, dropCrystal, type Crystal } from '../src/core/crystals';
import { addXp, createXpState } from '../src/core/xp';

const totalValue = (crystals: readonly Crystal[]): number =>
  crystals.reduce((sum, crystal) => sum + crystal.value, 0);

describe('dropCrystal', () => {
  it('adds a crystal where the enemy died when below the cap', () => {
    const drop = dropCrystal([], { x: 100, y: 200, value: 1 }, 3);
    expect(drop.mergedInto).toBeNull();
    expect(drop.crystals).toEqual([{ x: 100, y: 200, value: 1 }]);
  });

  it('keeps existing crystals untouched below the cap', () => {
    const existing = [{ x: 0, y: 0, value: 1 }];
    const drop = dropCrystal(existing, { x: 50, y: 50, value: 1 }, 3);
    expect(drop.crystals).toEqual([...existing, { x: 50, y: 50, value: 1 }]);
    expect(existing).toEqual([{ x: 0, y: 0, value: 1 }]);
  });

  it('adds the value to the nearest crystal at the cap', () => {
    const existing = [
      { x: 0, y: 0, value: 1 },
      { x: 500, y: 500, value: 2 },
      { x: 900, y: 100, value: 1 },
    ];
    const drop = dropCrystal(existing, { x: 480, y: 510, value: 1 }, 3);

    expect(drop.mergedInto).toBe(1);
    expect(drop.crystals).toHaveLength(3);
    expect(drop.crystals[1]).toEqual({ x: 500, y: 500, value: 3 });
    expect(drop.crystals[0]).toEqual(existing[0]);
    expect(drop.crystals[2]).toEqual(existing[2]);
  });

  it('loses no XP for a kill at the cap', () => {
    const existing = [
      { x: 0, y: 0, value: 1 },
      { x: 10, y: 0, value: 1 },
    ];
    const drop = dropCrystal(existing, { x: 300, y: 300, value: 5 }, 2);
    expect(totalValue(drop.crystals)).toBe(totalValue(existing) + 5);
  });

  it('never exceeds the cap and conserves XP over many kills', () => {
    const cap = 5;
    let crystals: Crystal[] = [];
    let dropped = 0;
    for (let kill = 0; kill < 200; kill++) {
      const value = kill % 7 === 0 ? 3 : 1;
      dropped += value;
      crystals = dropCrystal(
        crystals,
        { x: (kill * 137) % 1280, y: (kill * 71) % 720, value },
        cap,
      ).crystals;
      expect(crystals.length).toBeLessThanOrEqual(cap);
    }
    expect(crystals).toHaveLength(cap);
    expect(totalValue(crystals)).toBe(dropped);
  });

  it('leaves every bit of XP on the field collectible', () => {
    const tuning = { firstLevelXp: 1000, perLevelIncrease: 0 };
    let crystals: Crystal[] = [];
    for (let kill = 0; kill < 50; kill++) {
      crystals = dropCrystal(crystals, { x: kill * 10, y: 0, value: 1 }, 4).crystals;
    }

    // Collecting each crystal gives its whole value, merged or not.
    let xp = createXpState();
    for (const crystal of crystals) {
      xp = addXp(xp, crystal.value, tuning).state;
    }
    expect(xp.xp).toBe(50);
  });

  it('keeps collecting possible below the cap again after pickups', () => {
    const full = [
      { x: 0, y: 0, value: 4 },
      { x: 10, y: 0, value: 1 },
    ];
    const afterPickup = full.slice(1);
    const drop = dropCrystal(afterPickup, { x: 700, y: 300, value: 1 }, 2);
    expect(drop.mergedInto).toBeNull();
    expect(drop.crystals).toHaveLength(2);
  });
});

describe('crystalVelocity', () => {
  const PLAYER = { x: 600, y: 300 };
  const RANGE = 120;
  const SPEED = 520;

  it('stays put outside the pickup range', () => {
    expect(crystalVelocity({ x: 100, y: 300 }, PLAYER, RANGE, SPEED)).toEqual({ x: 0, y: 0 });
    expect(crystalVelocity({ x: 479, y: 300 }, PLAYER, RANGE, SPEED)).toEqual({ x: 0, y: 0 });
  });

  it('flies straight to the player inside the pickup range', () => {
    const velocity = crystalVelocity({ x: 500, y: 300 }, PLAYER, RANGE, SPEED);
    expect(velocity.x).toBeCloseTo(SPEED);
    expect(velocity.y).toBeCloseTo(0);
  });

  it('flies at the attract speed from any angle', () => {
    const velocity = crystalVelocity({ x: 650, y: 360 }, PLAYER, RANGE, SPEED);
    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(SPEED);
    expect(velocity.x).toBeLessThan(0);
    expect(velocity.y).toBeLessThan(0);
  });

  it('is attracted exactly at the edge of the range', () => {
    const velocity = crystalVelocity({ x: 480, y: 300 }, PLAYER, RANGE, SPEED);
    expect(velocity.x).toBeCloseTo(SPEED);
  });
});

describe('crystalTierIndex', () => {
  const TIERS = [
    { minValue: 1, colour: '#39e6ff', size: 10 },
    { minValue: 2, colour: '#a56bff', size: 14 },
  ];

  it('gives a value of 1 the first tier', () => {
    expect(crystalTierIndex(TIERS, 1)).toBe(0);
  });

  it('gives a value of 2 and above the second tier', () => {
    expect(crystalTierIndex(TIERS, 2)).toBe(1);
    expect(crystalTierIndex(TIERS, 3)).toBe(1);
    expect(crystalTierIndex(TIERS, 40)).toBe(1);
  });

  it('uses the highest tier reached when there are more tiers', () => {
    const more = [...TIERS, { minValue: 10, colour: '#ffd23f', size: 20 }];
    expect(crystalTierIndex(more, 9)).toBe(1);
    expect(crystalTierIndex(more, 10)).toBe(2);
  });

  it('follows the total of a crystal that absorbed others', () => {
    const merged = dropCrystal([{ x: 0, y: 0, value: 1 }], { x: 5, y: 0, value: 1 }, 1);
    expect(merged.crystals[0]?.value).toBe(2);
    expect(crystalTierIndex(TIERS, merged.crystals[0]?.value ?? 0)).toBe(1);
  });

  it('falls back to the first tier below it', () => {
    expect(crystalTierIndex(TIERS, 0.5)).toBe(0);
  });
});
