import { chaseVelocity } from './chase';
import type { Vec2 } from './movement';

/** An XP crystal lying in the arena. */
export interface Crystal {
  x: number;
  y: number;
  /** XP it gives when collected. */
  value: number;
}

export interface CrystalDrop {
  /** The crystals on the field after the drop. */
  crystals: Crystal[];
  /** Index of the existing crystal that absorbed the drop, or null if a new one was added. */
  mergedInto: number | null;
}

/**
 * Drops a crystal. Below the cap it is added to the field. At the cap its
 * value is added to the nearest existing crystal instead, so no XP is lost.
 */
export function dropCrystal(
  crystals: readonly Crystal[],
  drop: Crystal,
  maxCrystals: number,
): CrystalDrop {
  if (crystals.length < maxCrystals || crystals.length === 0) {
    return { crystals: [...crystals, drop], mergedInto: null };
  }

  let nearest = 0;
  let nearestDistance = Infinity;
  crystals.forEach((crystal, index) => {
    const distance = Math.hypot(crystal.x - drop.x, crystal.y - drop.y);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });

  return {
    crystals: crystals.map((crystal, index) =>
      index === nearest ? { ...crystal, value: crystal.value + drop.value } : crystal,
    ),
    mergedInto: nearest,
  };
}

/** How crystals of a given value look. A crystal uses the highest tier it reaches. */
export interface CrystalTier {
  /** The smallest crystal value that uses this tier. */
  minValue: number;
  /** Hex colour in the form "#rrggbb". */
  colour: string;
  /** Width and height in pixels. */
  size: number;
}

/**
 * The index of the tier for a crystal value: the highest tier whose
 * `minValue` is at most the value. Tiers must be sorted by `minValue`; a value
 * below the first tier uses the first tier.
 */
export function crystalTierIndex(tiers: readonly CrystalTier[], value: number): number {
  let index = 0;
  tiers.forEach((tier, i) => {
    if (tier.minValue <= value) {
      index = i;
    }
  });
  return index;
}

/** A crystal flies towards the player once inside the pickup range, and otherwise stays put. */
export function crystalVelocity(
  crystal: Vec2,
  player: Vec2,
  pickupRange: number,
  attractSpeed: number,
): Vec2 {
  const distance = Math.hypot(player.x - crystal.x, player.y - crystal.y);
  if (distance > pickupRange) {
    return { x: 0, y: 0 };
  }
  return chaseVelocity(crystal, player, attractSpeed);
}
