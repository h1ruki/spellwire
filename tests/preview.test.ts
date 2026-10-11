import { describe, expect, it } from 'vitest';
import type { Part } from '../src/core/loadout';
import type { Card } from '../src/core/offers';
import {
  BUILD_PROPERTIES,
  compareBuilds,
  compareProperty,
  formatAmount,
  previewCard,
  type BuildProperty,
} from '../src/core/preview';
import { applyCard, createBuild, type Build } from '../src/core/upgrade';
import { base, boost, fire, frost } from './shipped';

const FIRE: Card = { kind: 'part', part: fire };
const FROST: Card = { kind: 'part', part: frost };
const boostCard = (id: string): Card => ({ kind: 'boost', boost: boost(id) });
const take = (build: Build, ...cards: Card[]): Build =>
  cards.reduce((current, card) => applyCard(current, card).build, build);
const WITH_FIRE = take(createBuild(), FIRE);
const WITH_FROST = take(createBuild(), FROST);

const BURN = '12 damage over 3 s';
const SLOW = '40% for 2 s';

describe('previewCard for a part going into an empty slot', () => {
  it('Fire: everything it brings is a gain over the plain shot', () => {
    expect(previewCard(FIRE, createBuild(), base)).toEqual({
      slot: 'payload',
      replaces: 'Empty',
      comparisons: [
        {
          label: 'Direct damage',
          tone: 'gain',
          text: '100% → 125%',
          before: '100%',
          after: '125%',
        },
        { label: 'Burn', tone: 'gain', text: `Added: ${BURN}`, before: null, after: BURN },
      ],
    });
  });

  it('Frost: everything it brings is a gain over the plain shot', () => {
    expect(previewCard(FROST, createBuild(), base)).toEqual({
      slot: 'payload',
      replaces: 'Empty',
      comparisons: [
        {
          label: 'Direct damage',
          tone: 'gain',
          text: '100% → 110%',
          before: '100%',
          after: '110%',
        },
        { label: 'Slow', tone: 'gain', text: `Added: ${SLOW}`, before: null, after: SLOW },
      ],
    });
  });

  it('shows nothing as a loss', () => {
    for (const card of [FIRE, FROST]) {
      const tones = previewCard(card, createBuild(), base).comparisons.map((c) => c.tone);
      expect(tones).not.toContain('loss');
    }
  });

  it('leaves out a property that neither build has', () => {
    const labels = previewCard(FIRE, createBuild(), base).comparisons.map((c) => c.label);
    expect(labels).not.toContain('Slow');
  });
});

describe('previewCard for a part replacing another', () => {
  it('Fire to Frost: less damage and no burn are losses, the slow is a gain', () => {
    expect(previewCard(FROST, WITH_FIRE, base)).toEqual({
      slot: 'payload',
      replaces: 'Fire',
      comparisons: [
        {
          label: 'Direct damage',
          tone: 'loss',
          text: '125% → 110%',
          before: '125%',
          after: '110%',
        },
        { label: 'Burn', tone: 'loss', text: `Removed: ${BURN}`, before: BURN, after: null },
        { label: 'Slow', tone: 'gain', text: `Added: ${SLOW}`, before: null, after: SLOW },
      ],
    });
  });

  it('Frost to Fire: more damage and the burn are gains, losing the slow is a loss', () => {
    expect(previewCard(FIRE, WITH_FROST, base)).toEqual({
      slot: 'payload',
      replaces: 'Frost',
      comparisons: [
        {
          label: 'Direct damage',
          tone: 'gain',
          text: '110% → 125%',
          before: '110%',
          after: '125%',
        },
        { label: 'Burn', tone: 'gain', text: `Added: ${BURN}`, before: null, after: BURN },
        { label: 'Slow', tone: 'loss', text: `Removed: ${SLOW}`, before: SLOW, after: null },
      ],
    });
  });

  it('shows a property of the slot that stays the same as neutral', () => {
    const deepFrost: Part = {
      ...frost,
      id: 'deep-frost',
      name: 'Deep Frost',
      damageMultiplier: 1.3,
    };
    const sameDamage: Part = {
      ...frost,
      id: 'rime',
      name: 'Rime',
      slow: { percent: 60, durationSeconds: 2 },
    };

    expect(previewCard({ kind: 'part', part: deepFrost }, WITH_FROST, base).comparisons).toEqual([
      { label: 'Direct damage', tone: 'gain', text: '110% → 130%', before: '110%', after: '130%' },
      { label: 'Slow', tone: 'neutral', text: SLOW, before: SLOW, after: SLOW },
    ]);
    expect(previewCard({ kind: 'part', part: sameDamage }, WITH_FROST, base).comparisons).toEqual([
      { label: 'Direct damage', tone: 'neutral', text: '110%', before: '110%', after: '110%' },
      {
        label: 'Slow',
        tone: 'gain',
        text: '40% for 2 s → 60% for 2 s',
        before: SLOW,
        after: '60% for 2 s',
      },
    ]);
  });

  it('reads the numbers from the parts, not from fixed text', () => {
    const hotter: Part = {
      ...fire,
      damageMultiplier: 1.4,
      burn: { durationSeconds: 5, totalDamage: 30 },
    };
    const comparisons = previewCard({ kind: 'part', part: hotter }, WITH_FROST, base).comparisons;
    expect(comparisons.map((c) => c.text)).toEqual([
      '110% → 140%',
      'Added: 30 damage over 5 s',
      `Removed: ${SLOW}`,
    ]);
  });

  it('includes the damage boosts already taken', () => {
    const boosted = take(createBuild(), boostCard('damage'), boostCard('damage'), FIRE);
    // 125% with two +10% boosts is 150%; Frost would be 110% x 1.2 = 132%.
    expect(previewCard(FROST, boosted, base).comparisons[0]).toEqual({
      label: 'Direct damage',
      tone: 'loss',
      text: '150% → 132%',
      before: '150%',
      after: '132%',
    });
  });

  it('leaves unrelated stats off a part card, even after boosts', () => {
    const boosted = take(WITH_FIRE, boostCard('fire-rate'), boostCard('max-health'));
    const labels = previewCard(FROST, boosted, base).comparisons.map((c) => c.label);
    expect(labels).toEqual(['Direct damage', 'Burn', 'Slow']);
  });

  it('does not change the build it describes', () => {
    const build = createBuild();
    previewCard(FIRE, build, base);
    expect(build.loadout.payload).toBeNull();
  });
});

describe('previewCard for a stat boost', () => {
  it.each([
    ['fire-rate', 'Fire rate', '3.0/s', '3.3/s'],
    ['damage', 'Direct damage', '100%', '110%'],
    ['move-speed', 'Move speed', '320', '346'],
    ['max-health', 'Max health', '100', '120'],
    ['pickup-range', 'Pickup range', '120', '150'],
  ])('%s: one gain, from the current value to the new one', (id, label, before, after) => {
    expect(previewCard(boostCard(id), createBuild(), base)).toEqual({
      slot: null,
      replaces: null,
      comparisons: [{ label, tone: 'gain', text: `${before} → ${after}`, before, after }],
    });
  });

  it('starts from the value after earlier picks of the same boost', () => {
    const twice = take(createBuild(), boostCard('fire-rate'), boostCard('fire-rate'));
    expect(previewCard(boostCard('fire-rate'), twice, base).comparisons).toEqual([
      { label: 'Fire rate', tone: 'gain', text: '3.6/s → 3.9/s', before: '3.6/s', after: '3.9/s' },
    ]);
  });

  it('shows a damage boost on top of the payload', () => {
    expect(previewCard(boostCard('damage'), WITH_FIRE, base).comparisons).toEqual([
      {
        label: 'Direct damage',
        tone: 'gain',
        text: '125% → 137.5%',
        before: '125%',
        after: '137.5%',
      },
    ]);
  });

  it('does not list the payload properties it leaves alone', () => {
    const labels = previewCard(boostCard('move-speed'), WITH_FIRE, base).comparisons.map(
      (c) => c.label,
    );
    expect(labels).toEqual(['Move speed']);
  });
});

describe('compareProperty', () => {
  const cooldown: BuildProperty = {
    label: 'Dash cooldown',
    slot: 'trigger',
    better: 'lower',
    read: () => null,
  };
  const damage: BuildProperty = { ...cooldown, label: 'Damage', better: 'higher' };
  const value = (score: number, text: string) => ({ score, text });

  it('judges a change by what the property means, not by the number going up', () => {
    expect(compareProperty(cooldown, value(1.5, '1.5 s'), value(2.5, '2.5 s'))?.tone).toBe('loss');
    expect(compareProperty(cooldown, value(2.5, '2.5 s'), value(1.5, '1.5 s'))?.tone).toBe('gain');
    expect(compareProperty(damage, value(1.5, '1.5'), value(2.5, '2.5'))?.tone).toBe('gain');
    expect(compareProperty(damage, value(2.5, '2.5'), value(1.5, '1.5'))?.tone).toBe('loss');
  });

  it('treats gaining a property as a gain and losing it as a loss', () => {
    expect(compareProperty(damage, null, value(5, '5'))).toMatchObject({
      tone: 'gain',
      text: 'Added: 5',
    });
    expect(compareProperty(damage, value(5, '5'), null)).toMatchObject({
      tone: 'loss',
      text: 'Removed: 5',
    });
  });

  it('is neutral when nothing changes, and absent when neither build has the property', () => {
    expect(compareProperty(damage, value(5, '5'), value(5, '5'))).toMatchObject({
      tone: 'neutral',
      text: '5',
    });
    expect(compareProperty(damage, null, null)).toBeNull();
  });

  it('is neutral when the value reads differently but is worth the same', () => {
    expect(
      compareProperty(damage, value(12, '12 over 3 s'), value(12, '12 over 4 s')),
    ).toMatchObject({
      tone: 'neutral',
      text: '12 over 3 s → 12 over 4 s',
    });
  });
});

describe('compareBuilds', () => {
  it('lists nothing for a slot-less comparison of a build with itself', () => {
    expect(compareBuilds(WITH_FIRE, WITH_FIRE, base, null)).toEqual([]);
  });

  it('lists the properties of the named slot even when they are unchanged', () => {
    const same = compareBuilds(WITH_FIRE, WITH_FIRE, base, 'payload');
    expect(same.map((c) => [c.label, c.tone])).toEqual([
      ['Direct damage', 'neutral'],
      ['Burn', 'neutral'],
    ]);
  });

  it('accepts further properties, as later parts will need', () => {
    const shots: BuildProperty = {
      label: 'Shots',
      slot: 'modifier',
      better: 'higher',
      read: (build) => ({ score: build.boosts.length + 1, text: String(build.boosts.length + 1) }),
    };
    const after = take(createBuild(), boostCard('move-speed'));
    const comparisons = compareBuilds(createBuild(), after, base, null, [
      ...BUILD_PROPERTIES,
      shots,
    ]);
    expect(comparisons.map((c) => c.label)).toEqual(['Move speed', 'Shots']);
  });
});

describe('formatAmount', () => {
  it.each([
    [10, '10'],
    [11.5, '11.5'],
    [12.65, '12.7'],
    [8.499999, '8.5'],
    [137.50000000000003, '137.5'],
    [0.04, '0'],
  ])('shows %d as %s', (value, expected) => {
    expect(formatAmount(value)).toBe(expected);
  });
});
