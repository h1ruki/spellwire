import { shotProfile, type Slot } from './loadout';
import type { Card } from './offers';
import type { PlayerStats } from './stats';
import { applyCard, buildStats, shotDamage, type Build } from './upgrade';

/** Shown in place of a part name when the slot has nothing in it. */
export const EMPTY_SLOT = 'Empty';

/** One thing about a build as the player reads it. */
export interface PropertyValue {
  /** Compares two values of the same property; what counts as better is the property's `better`. */
  score: number;
  /** The value as shown, e.g. "125%" or "40% for 2 s". */
  text: string;
}

/**
 * Something a card can change and that is worth comparing. New kinds of parts
 * add their own properties here; nothing else in the comparison changes.
 */
export interface BuildProperty {
  label: string;
  /**
   * The slot that governs the property, or null for a plain stat. A card for a
   * part also lists the unchanged properties of its slot, so the whole part is
   * compared, not only what differs.
   */
  slot: Slot | null;
  /** Which way is good for the player. A lower cooldown, say, is better. */
  better: 'higher' | 'lower';
  /** The value for a build, or null when the build does not have the property at all. */
  read: (build: Build, base: PlayerStats) => PropertyValue | null;
}

/** Whether a change is good for the player (gain), bad (loss) or no change (neutral). */
export type Tone = 'gain' | 'loss' | 'neutral';

/** One property compared between the current build and the build a card would give. */
export interface Comparison {
  label: string;
  tone: Tone;
  /** The comparison in words, e.g. "125% → 110%", "Added: 40% for 2 s" or "Removed: 12 over 3 s". */
  text: string;
  /** The value now, or null if the build does not have the property. */
  before: string | null;
  /** The value after taking the card, or null if the property would be lost. */
  after: string | null;
}

/** What accepting a card would do, for the player to read before choosing. */
export interface CardPreview {
  /** The slot a part goes into; null for a stat boost. */
  slot: Slot | null;
  /** For a part: the name of the part it replaces, or "Empty". Null for a stat boost. */
  replaces: string | null;
  comparisons: Comparison[];
}

/** At most one decimal place, without a trailing ".0". */
export function formatAmount(value: number): string {
  // Rounding twice keeps a value such as 10 x 1.1 x 1.15 = 12.65 from showing as 12.6.
  return String(Math.round(Number((value * 10).toFixed(6))) / 10);
}

const stat = (
  label: string,
  read: (stats: PlayerStats) => number,
  format: (value: number) => string,
): BuildProperty => ({
  label,
  slot: null,
  better: 'higher',
  read: (build, base) => {
    const value = read(buildStats(build, base));
    return { score: value, text: format(value) };
  },
});

const whole = (value: number): string => String(Math.round(value));

/** Everything the current cards can change, in the order it is listed on a card. */
export const BUILD_PROPERTIES: readonly BuildProperty[] = [
  {
    // Direct damage of one shot as a share of the plain, unboosted shot, so the
    // payload and the damage boosts read on one scale.
    label: 'Direct damage',
    slot: 'payload',
    better: 'higher',
    read: (build, base) => {
      const percent = (shotDamage(build, base) / base.damage) * 100;
      return { score: percent, text: `${formatAmount(percent)}%` };
    },
  },
  {
    label: 'Burn',
    slot: 'payload',
    better: 'higher',
    read: (build) => {
      const { burn } = shotProfile(build.loadout);
      return (
        burn && {
          score: burn.totalDamage,
          text: `${formatAmount(burn.totalDamage)} damage over ${formatAmount(burn.durationSeconds)} s`,
        }
      );
    },
  },
  {
    label: 'Slow',
    slot: 'payload',
    better: 'higher',
    read: (build) => {
      const { slow } = shotProfile(build.loadout);
      return (
        slow && {
          score: slow.percent * slow.durationSeconds,
          text: `${formatAmount(slow.percent)}% for ${formatAmount(slow.durationSeconds)} s`,
        }
      );
    },
  },
  stat(
    'Fire rate',
    (stats) => stats.fireRate,
    (value) => `${value.toFixed(1)}/s`,
  ),
  stat('Move speed', (stats) => stats.moveSpeed, whole),
  stat('Max health', (stats) => stats.maxHealth, whole),
  stat('Pickup range', (stats) => stats.pickupRange, whole),
];

/**
 * Compares one property between two builds, or returns null when neither build
 * has it. Gaining a property is a gain and losing one is a loss; a changed
 * value is judged by the property's own idea of better, so a number going up
 * is not assumed to be good.
 */
export function compareProperty(
  property: BuildProperty,
  before: PropertyValue | null,
  after: PropertyValue | null,
): Comparison | null {
  const { label } = property;
  if (!before && !after) {
    return null;
  }
  if (!before && after) {
    return { label, tone: 'gain', text: `Added: ${after.text}`, before: null, after: after.text };
  }
  if (before && !after) {
    return {
      label,
      tone: 'loss',
      text: `Removed: ${before.text}`,
      before: before.text,
      after: null,
    };
  }
  if (!before || !after) {
    return null;
  }

  const texts = { before: before.text, after: after.text };
  if (before.text === after.text) {
    return { label, tone: 'neutral', text: after.text, ...texts };
  }
  const rise = after.score - before.score;
  const improvement = property.better === 'higher' ? rise : -rise;
  const tone: Tone = improvement > 0 ? 'gain' : improvement < 0 ? 'loss' : 'neutral';
  return { label, tone, text: `${before.text} → ${after.text}`, ...texts };
}

/**
 * Compares two builds property by property. Every property that differs is
 * listed. Unchanged ones are listed only for `slot`, the slot being filled, so
 * a part is compared whole while a stat boost shows only what it changes.
 */
export function compareBuilds(
  before: Build,
  after: Build,
  base: PlayerStats,
  slot: Slot | null,
  properties: readonly BuildProperty[] = BUILD_PROPERTIES,
): Comparison[] {
  const comparisons: Comparison[] = [];
  for (const property of properties) {
    const comparison = compareProperty(
      property,
      property.read(before, base),
      property.read(after, base),
    );
    if (!comparison) {
      continue;
    }
    const unchanged = comparison.before === comparison.after;
    if (!unchanged || (slot !== null && property.slot === slot)) {
      comparisons.push(comparison);
    }
  }
  return comparisons;
}

/**
 * Describes a card by comparing the build as it is with the build the card
 * would give, so the preview cannot disagree with what accepting it does.
 */
export function previewCard(card: Card, build: Build, base: PlayerStats): CardPreview {
  const after = applyCard(build, card).build;
  if (card.kind === 'boost') {
    return { slot: null, replaces: null, comparisons: compareBuilds(build, after, base, null) };
  }
  const slot = card.part.slot;
  return {
    slot,
    replaces: build.loadout[slot]?.name ?? EMPTY_SLOT,
    comparisons: compareBuilds(build, after, base, slot),
  };
}
