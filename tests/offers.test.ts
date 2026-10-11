import { describe, expect, it } from 'vitest';
import { createLoadout, installPart, type Part } from '../src/core/loadout';
import {
  addPendingOffers,
  buildOffer,
  createPendingOffers,
  hasPendingOffers,
  OFFER_SIZE,
  openNextOffer,
  resolveOffer,
  type Card,
  type CardPool,
  type Offer,
} from '../src/core/offers';
import { createRng } from '../src/core/rng';
import { applyCard, createBuild } from '../src/core/upgrade';
import { boost, fire, frost, shipped } from './shipped';

const POOL: CardPool = { parts: shipped.parts, boosts: shipped.boosts };
const SEEDS = Array.from({ length: 200 }, (_, seed) => seed);
const EMPTY = createLoadout();
const WITH_FIRE = installPart(EMPTY, fire).loadout;
const WITH_FROST = installPart(EMPTY, frost).loadout;

const cardId = (card: Card): string =>
  card.kind === 'part' ? `part:${card.part.id}` : `boost:${card.boost.id}`;
const ids = (offer: Offer): string[] => offer.cards.map(cardId);
const partIds = (offer: Offer): string[] => ids(offer).filter((id) => id.startsWith('part:'));
const boostIds = (offer: Offer): string[] => ids(offer).filter((id) => id.startsWith('boost:'));

describe('buildOffer', () => {
  it.each([
    ['an empty loadout', EMPTY],
    ['Fire installed', WITH_FIRE],
    ['Frost installed', WITH_FROST],
  ])('with %s: at most 3 cards, no duplicates, and Skip', (_name, loadout) => {
    for (const seed of SEEDS) {
      const offer = buildOffer(POOL, loadout, createRng(seed));
      expect(offer.cards.length).toBeLessThanOrEqual(OFFER_SIZE);
      expect(new Set(ids(offer)).size).toBe(offer.cards.length);
      expect(offer.canSkip).toBe(true);
    }
  });

  it('never offers an installed part', () => {
    for (const seed of SEEDS) {
      expect(ids(buildOffer(POOL, WITH_FIRE, createRng(seed)))).not.toContain('part:fire');
      expect(ids(buildOffer(POOL, WITH_FROST, createRng(seed)))).not.toContain('part:frost');
    }
  });

  it('is reproducible with a seed', () => {
    for (const seed of SEEDS) {
      expect(buildOffer(POOL, EMPTY, createRng(seed))).toEqual(
        buildOffer(POOL, EMPTY, createRng(seed)),
      );
      expect(buildOffer(POOL, WITH_FIRE, createRng(seed))).toEqual(
        buildOffer(POOL, WITH_FIRE, createRng(seed)),
      );
    }
  });

  it('uses the rng for the cards that are not guaranteed', () => {
    const thirdCards = SEEDS.map((seed) => ids(buildOffer(POOL, EMPTY, createRng(seed)))[2]);
    expect(new Set(thirdCards).size).toBe(shipped.boosts.length);
  });

  it('first offer with an empty payload slot: exactly Fire, Frost and one stat boost', () => {
    for (const seed of SEEDS) {
      const offer = buildOffer(POOL, EMPTY, createRng(seed));
      expect(offer.cards).toHaveLength(3);
      expect(partIds(offer)).toEqual(['part:fire', 'part:frost']);
      expect(boostIds(offer)).toHaveLength(1);
    }
  });

  it('later offers: the payload that is not installed plus two different boosts', () => {
    for (const seed of SEEDS) {
      const afterFire = buildOffer(POOL, WITH_FIRE, createRng(seed));
      expect(partIds(afterFire)).toEqual(['part:frost']);
      expect(new Set(boostIds(afterFire)).size).toBe(2);

      const afterFrost = buildOffer(POOL, WITH_FROST, createRng(seed));
      expect(partIds(afterFrost)).toEqual(['part:fire']);
      expect(new Set(boostIds(afterFrost)).size).toBe(2);
    }
  });

  it('may repeat a boost across offers but never within one', () => {
    const rng = createRng(11);
    const offers = Array.from({ length: 6 }, () => buildOffer(POOL, WITH_FIRE, rng));
    const allBoosts = offers.flatMap(boostIds);
    // 12 boost cards from a pool of 5: some must come back in a later offer.
    expect(allBoosts).toHaveLength(12);
    expect(new Set(allBoosts).size).toBeLessThan(allBoosts.length);
    for (const offer of offers) {
      expect(new Set(boostIds(offer)).size).toBe(2);
    }
  });

  it('keeps offering a boost the player has already taken', () => {
    const taken = applyCard(createBuild(), { kind: 'boost', boost: boost('damage') }).build;
    const seen = SEEDS.flatMap((seed) => ids(buildOffer(POOL, taken.loadout, createRng(seed))));
    expect(seen).toContain('boost:damage');
  });

  it('puts parts before boosts, in file order', () => {
    const offer = buildOffer(POOL, EMPTY, createRng(3));
    expect(offer.cards.map((card) => card.kind)).toEqual(['part', 'part', 'boost']);
  });

  it('shows what exists instead of padding when the pool is small', () => {
    const small: CardPool = { parts: [fire], boosts: [boost('damage')] };
    expect(ids(buildOffer(small, EMPTY, createRng(1)))).toEqual(['part:fire', 'boost:damage']);
    expect(ids(buildOffer(small, WITH_FIRE, createRng(1)))).toEqual(['boost:damage']);

    const empty = buildOffer({ parts: [], boosts: [] }, EMPTY, createRng(1));
    expect(empty.cards).toEqual([]);
    expect(empty.canSkip).toBe(true);
  });

  it('fills with parts when there are no boosts', () => {
    const third: Part = { ...fire, id: 'spark', name: 'Spark' };
    const pool: CardPool = { parts: [fire, frost, third], boosts: [] };
    for (const seed of SEEDS) {
      expect(ids(buildOffer(pool, EMPTY, createRng(seed)))).toEqual([
        'part:fire',
        'part:frost',
        'part:spark',
      ]);
    }
  });
});

describe('pending offers', () => {
  it('starts with none, so play is not paused', () => {
    const state = createPendingOffers();
    expect(hasPendingOffers(state)).toBe(false);
    expect(openNextOffer(state, POOL, EMPTY, createRng(1)).active).toBeNull();
  });

  it('adds one pending offer per level gained and none for no level', () => {
    expect(addPendingOffers(createPendingOffers(), 0).pending).toBe(0);
    expect(addPendingOffers(createPendingOffers(), 1).pending).toBe(1);
    expect(addPendingOffers(addPendingOffers(createPendingOffers(), 2), 1).pending).toBe(3);
  });

  it('does not build an offer until it opens', () => {
    const state = addPendingOffers(createPendingOffers(), 2);
    expect(state.active).toBeNull();
  });

  it('does not replace an offer that is already open', () => {
    const rng = createRng(4);
    const open = openNextOffer(addPendingOffers(createPendingOffers(), 2), POOL, EMPTY, rng);
    expect(openNextOffer(open, POOL, WITH_FIRE, rng)).toBe(open);
  });

  it('resolving with nothing open changes nothing', () => {
    const state = addPendingOffers(createPendingOffers(), 1);
    expect(resolveOffer(state)).toBe(state);
  });

  it('two levels at once: two offers in turn, the second built from the first choice', () => {
    const rng = createRng(2026);
    let build = createBuild();
    let offers = addPendingOffers(createPendingOffers(), 2);
    expect(offers.pending).toBe(2);
    expect(hasPendingOffers(offers)).toBe(true);

    // First offer: Fire and Frost are both on it. The player installs Fire.
    offers = openNextOffer(offers, POOL, build.loadout, rng);
    const first = offers.active;
    expect(first && ids(first)).toContain('part:fire');
    build = applyCard(build, { kind: 'part', part: fire }).build;
    offers = resolveOffer(offers);

    // One choice made: an offer is still owed, so play stays paused.
    expect(offers.pending).toBe(1);
    expect(offers.active).toBeNull();
    expect(hasPendingOffers(offers)).toBe(true);

    // Second offer: built now, from the loadout that holds Fire.
    offers = openNextOffer(offers, POOL, build.loadout, rng);
    const second = offers.active;
    expect(second && ids(second)).not.toContain('part:fire');
    expect(second && partIds(second)).toEqual(['part:frost']);
    expect(hasPendingOffers(offers)).toBe(true);

    // Only after the second choice does play resume.
    offers = resolveOffer(offers);
    expect(offers).toEqual({ pending: 0, active: null });
    expect(hasPendingOffers(offers)).toBe(false);
  });

  it('a level gained while an offer is open waits its turn', () => {
    const rng = createRng(8);
    let offers = openNextOffer(addPendingOffers(createPendingOffers(), 1), POOL, EMPTY, rng);
    const open = offers.active;
    offers = addPendingOffers(offers, 1);
    expect(offers.active).toBe(open);
    offers = resolveOffer(offers);
    expect(hasPendingOffers(offers)).toBe(true);
  });
});
