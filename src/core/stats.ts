export const STATS = ['fireRate', 'damage', 'moveSpeed', 'maxHealth', 'pickupRange'] as const;
export type Stat = (typeof STATS)[number];

export const BOOST_UNITS = ['percent', 'flat'] as const;
export type BoostUnit = (typeof BOOST_UNITS)[number];

/** A stat-boost card from the boosts file. It does not use a loadout slot. */
export interface Boost {
  id: string;
  stat: Stat;
  name: string;
  description: string;
  amount: number;
  /** "percent" adds that share of the base value; "flat" adds the amount itself. */
  unit: BoostUnit;
}

/**
 * The player's numbers: shots per second, direct damage of a plain shot,
 * pixels per second, health and pixels.
 */
export type PlayerStats = Readonly<Record<Stat, number>>;

/** The tuning values the stats start from. */
export interface StatsTuning {
  moveSpeed: number;
  fire: { shotsPerSecond: number; projectileDamage: number };
  player: { maxHealth: number };
  pickupRange: number;
}

export function baseStats(tuning: StatsTuning): PlayerStats {
  return {
    fireRate: tuning.fire.shotsPerSecond,
    damage: tuning.fire.projectileDamage,
    moveSpeed: tuning.moveSpeed,
    maxHealth: tuning.player.maxHealth,
    pickupRange: tuning.pickupRange,
  };
}

/**
 * The base values plus every boost taken so far. Percentages of the same stat
 * add up before they are applied, so two +10% picks give +20%, not +21%.
 */
export function effectiveStats(base: PlayerStats, taken: readonly Boost[]): PlayerStats {
  const stats: Record<Stat, number> = { ...base };
  for (const stat of STATS) {
    let percent = 0;
    let flat = 0;
    for (const boost of taken) {
      if (boost.stat !== stat) {
        continue;
      }
      if (boost.unit === 'percent') {
        percent += boost.amount;
      } else {
        flat += boost.amount;
      }
    }
    stats[stat] = base[stat] * (1 + percent / 100) + flat;
  }
  return stats;
}
