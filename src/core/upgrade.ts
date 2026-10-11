import { withMaxHealth, type HealthState } from './health';
import { createLoadout, installPart, shotProfile, type Loadout, type Part } from './loadout';
import type { Card } from './offers';
import { effectiveStats, type Boost, type PlayerStats } from './stats';

/** Everything the player has built up during a run. */
export interface Build {
  loadout: Loadout;
  /** Every stat boost taken, in order; the same boost can appear more than once. */
  boosts: readonly Boost[];
}

/** A run starts with an empty loadout and no boosts. */
export function createBuild(): Build {
  return { loadout: createLoadout(), boosts: [] };
}

export interface CardResult {
  build: Build;
  /** The part the card pushed out of its slot, if any. */
  replaced: Part | null;
}

/** A part goes into its slot; a boost is added to the ones already taken. */
export function applyCard(build: Build, card: Card): CardResult {
  if (card.kind === 'boost') {
    return { build: { ...build, boosts: [...build.boosts, card.boost] }, replaced: null };
  }
  const installed = installPart(build.loadout, card.part);
  return { build: { ...build, loadout: installed.loadout }, replaced: installed.replaced };
}

export function buildStats(build: Build, base: PlayerStats): PlayerStats {
  return effectiveStats(base, build.boosts);
}

/** Direct damage of one shot: the damage stat times the payload's multiplier. */
export function shotDamage(build: Build, base: PlayerStats): number {
  return buildStats(build, base).damage * shotProfile(build.loadout).damageMultiplier;
}

export interface TakenCard extends CardResult {
  health: HealthState;
}

/**
 * Accepts a card from an offer. Besides changing the build, a card that raises
 * maximum health raises current health by the same amount.
 */
export function takeCard(
  build: Build,
  health: HealthState,
  card: Card,
  base: PlayerStats,
): TakenCard {
  const result = applyCard(build, card);
  return { ...result, health: withMaxHealth(health, buildStats(result.build, base).maxHealth) };
}
