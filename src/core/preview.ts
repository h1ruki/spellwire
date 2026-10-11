import { shotProfile, type Slot } from './loadout';
import type { Card } from './offers';
import type { PlayerStats } from './stats';
import { applyCard, buildStats, shotDamage, type Build } from './upgrade';

/** Shown in place of a part name when the slot has nothing in it. */
export const EMPTY_SLOT = 'Empty';
/** Shown when a shot has no burn or no slow. */
export const NO_EFFECT = 'None';

/** One value a card would change. */
export interface PreviewLine {
  label: string;
  before: string;
  after: string;
}

/** What accepting a card would do, for the player to read before choosing. */
export interface CardPreview {
  /** The slot a part goes into; null for a stat boost. */
  slot: Slot | null;
  /** For a part: the name of the part it replaces, or "Empty". Null for a stat boost. */
  replaces: string | null;
  /** Only the values that would change. */
  changes: PreviewLine[];
}

/** At most one decimal place, without a trailing ".0". */
export function formatAmount(value: number): string {
  // Rounding twice keeps a value such as 10 x 1.1 x 1.15 = 12.65 from showing as 12.6.
  return String(Math.round(Number((value * 10).toFixed(6))) / 10);
}

/** Every value a card can change, as shown to the player. */
function summary(build: Build, base: PlayerStats): [label: string, value: string][] {
  const stats = buildStats(build, base);
  const { burn, slow } = shotProfile(build.loadout);
  return [
    ['Fire rate', `${stats.fireRate.toFixed(1)}/s`],
    ['Shot damage', formatAmount(shotDamage(build, base))],
    [
      'Burn',
      burn
        ? `${formatAmount(burn.totalDamage)} over ${formatAmount(burn.durationSeconds)} s`
        : NO_EFFECT,
    ],
    [
      'Slow',
      slow
        ? `${formatAmount(slow.percent)}% for ${formatAmount(slow.durationSeconds)} s`
        : NO_EFFECT,
    ],
    ['Move speed', String(Math.round(stats.moveSpeed))],
    ['Max health', String(Math.round(stats.maxHealth))],
    ['Pickup range', String(Math.round(stats.pickupRange))],
  ];
}

/**
 * Describes a card by comparing the build as it is with the build the card
 * would give, so the preview cannot disagree with what accepting it does.
 */
export function previewCard(card: Card, build: Build, base: PlayerStats): CardPreview {
  const before = summary(build, base);
  const after = summary(applyCard(build, card).build, base);

  const changes: PreviewLine[] = [];
  before.forEach(([label, value], index) => {
    const next = after[index]?.[1] ?? value;
    if (next !== value) {
      changes.push({ label, before: value, after: next });
    }
  });

  if (card.kind === 'boost') {
    return { slot: null, replaces: null, changes };
  }
  const slot = card.part.slot;
  return { slot, replaces: build.loadout[slot]?.name ?? EMPTY_SLOT, changes };
}
