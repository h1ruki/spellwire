import { isInstalled, type Loadout, type Part } from './loadout';
import { pickDistinct, type Rng } from './rng';
import type { Boost } from './stats';

/** Most cards in one offer. */
export const OFFER_SIZE = 3;
/** While the payload slot is empty, this many payloads are guaranteed in an offer. */
export const FIRST_PAYLOAD_CHOICES = 2;

export type Card =
  | { readonly kind: 'part'; readonly part: Part }
  | { readonly kind: 'boost'; readonly boost: Boost };

/** One level-up choice. */
export interface Offer {
  /** Up to three different cards, parts first. */
  cards: readonly Card[];
  /** Skipping is always allowed. */
  canSkip: true;
}

/** Everything that can appear on a card. */
export interface CardPool {
  parts: readonly Part[];
  boosts: readonly Boost[];
}

/**
 * Builds an offer for the current loadout.
 *
 * - An installed part is never offered, and no card appears twice.
 * - While the payload slot is empty, two payloads are guaranteed and the last
 *   card is a stat boost.
 * - Otherwise one part that is not installed is guaranteed while one exists,
 *   and the other cards are drawn from the remaining parts and the boosts.
 * - If fewer than three cards are available the offer is shorter, not padded.
 *
 * The same pool, loadout and rng sequence always give the same offer.
 */
export function buildOffer(pool: CardPool, loadout: Loadout, rng: Rng): Offer {
  const parts = pool.parts.filter((part) => !isInstalled(loadout, part.id));
  const payloads = parts.filter((part) => part.slot === 'payload');
  const payloadEmpty = loadout.payload === null;

  let guaranteed = payloadEmpty ? pickDistinct(payloads, FIRST_PAYLOAD_CHOICES, rng) : [];
  if (guaranteed.length === 0) {
    guaranteed = pickDistinct(parts, 1, rng);
  }

  const chosen: Card[] = guaranteed.map((part) => ({ kind: 'part', part }));
  const otherParts: Card[] = parts
    .filter((part) => !guaranteed.includes(part))
    .map((part) => ({ kind: 'part', part }));
  const boosts: Card[] = pool.boosts.map((boost) => ({ kind: 'boost', boost }));

  // With an empty payload slot the last card is a boost; parts fill in only if boosts run out.
  const fillPools = payloadEmpty ? [boosts, otherParts] : [[...otherParts, ...boosts]];
  for (const fillPool of fillPools) {
    chosen.push(...pickDistinct(fillPool, OFFER_SIZE - chosen.length, rng));
  }

  return { cards: inPoolOrder(chosen, pool), canSkip: true };
}

/** Parts before boosts, each in file order, so a card keeps a predictable place. */
function inPoolOrder(cards: readonly Card[], pool: CardPool): Card[] {
  const position = (card: Card): number =>
    card.kind === 'part'
      ? pool.parts.indexOf(card.part)
      : pool.parts.length + pool.boosts.indexOf(card.boost);
  return [...cards].sort((a, b) => position(a) - position(b));
}

/** Level-up choices that have not been made yet. Play is paused while any remain. */
export interface PendingOffers {
  /** Unresolved level-ups, including the one whose offer is open. */
  pending: number;
  /** The open offer, or null when none is open. */
  active: Offer | null;
}

export function createPendingOffers(): PendingOffers {
  return { pending: 0, active: null };
}

/** Each level gained owes the player one offer. */
export function addPendingOffers(state: PendingOffers, levelsGained: number): PendingOffers {
  return { ...state, pending: state.pending + Math.max(0, levelsGained) };
}

export function hasPendingOffers(state: PendingOffers): boolean {
  return state.pending > 0;
}

/**
 * Opens the next offer if one is owed and none is open. The offer is built at
 * this moment from the loadout as it stands, so it reflects the choice made in
 * the offer before it; offers are never built ahead of time.
 */
export function openNextOffer(
  state: PendingOffers,
  pool: CardPool,
  loadout: Loadout,
  rng: Rng,
): PendingOffers {
  if (state.active || state.pending === 0) {
    return state;
  }
  return { ...state, active: buildOffer(pool, loadout, rng) };
}

/** Closes the open offer once the player has chosen a card or skipped. */
export function resolveOffer(state: PendingOffers): PendingOffers {
  if (!state.active) {
    return state;
  }
  return { pending: state.pending - 1, active: null };
}
