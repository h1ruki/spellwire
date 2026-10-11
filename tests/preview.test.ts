import { describe, expect, it } from 'vitest';
import type { Card } from '../src/core/offers';
import { formatAmount, previewCard } from '../src/core/preview';
import { applyCard, createBuild } from '../src/core/upgrade';
import { base, boost, fire, frost } from './shipped';

const FIRE: Card = { kind: 'part', part: fire };
const FROST: Card = { kind: 'part', part: frost };
const boostCard = (id: string): Card => ({ kind: 'boost', boost: boost(id) });
const WITH_FIRE = applyCard(createBuild(), FIRE).build;

describe('previewCard for a part', () => {
  it('into an empty slot: names the slot, says "Empty" and shows what changes', () => {
    expect(previewCard(FIRE, createBuild(), base)).toEqual({
      slot: 'payload',
      replaces: 'Empty',
      changes: [
        { label: 'Shot damage', before: '10', after: '11.5' },
        { label: 'Burn', before: 'None', after: '12 over 3 s' },
      ],
    });
    expect(previewCard(FROST, createBuild(), base)).toEqual({
      slot: 'payload',
      replaces: 'Empty',
      changes: [
        { label: 'Shot damage', before: '10', after: '8.5' },
        { label: 'Slow', before: 'None', after: '40% for 2 s' },
      ],
    });
  });

  it('into an occupied slot: names the part it replaces and shows before and after', () => {
    expect(previewCard(FROST, WITH_FIRE, base)).toEqual({
      slot: 'payload',
      replaces: 'Fire',
      changes: [
        { label: 'Shot damage', before: '11.5', after: '8.5' },
        { label: 'Burn', before: '12 over 3 s', after: 'None' },
        { label: 'Slow', before: 'None', after: '40% for 2 s' },
      ],
    });
  });

  it('includes the damage boosts already taken', () => {
    const boosted = applyCard(createBuild(), boostCard('damage')).build;
    expect(previewCard(FIRE, boosted, base).changes[0]).toEqual({
      label: 'Shot damage',
      before: '11',
      after: '12.7',
    });
  });

  it('does not change the build it describes', () => {
    const build = createBuild();
    previewCard(FIRE, build, base);
    expect(build.loadout.payload).toBeNull();
  });
});

describe('previewCard for a stat boost', () => {
  it.each([
    ['fire-rate', { label: 'Fire rate', before: '3.0/s', after: '3.3/s' }],
    ['damage', { label: 'Shot damage', before: '10', after: '11' }],
    ['move-speed', { label: 'Move speed', before: '320', after: '346' }],
    ['max-health', { label: 'Max health', before: '100', after: '120' }],
    ['pickup-range', { label: 'Pickup range', before: '120', after: '150' }],
  ])('%s: shows the stat with its current and new value', (id, line) => {
    expect(previewCard(boostCard(id), createBuild(), base)).toEqual({
      slot: null,
      replaces: null,
      changes: [line],
    });
  });

  it('starts from the value after earlier picks', () => {
    const once = applyCard(createBuild(), boostCard('fire-rate')).build;
    expect(previewCard(boostCard('fire-rate'), once, base).changes).toEqual([
      { label: 'Fire rate', before: '3.3/s', after: '3.6/s' },
    ]);
  });

  it('shows a damage boost with the payload multiplier applied', () => {
    expect(previewCard(boostCard('damage'), WITH_FIRE, base).changes).toEqual([
      { label: 'Shot damage', before: '11.5', after: '12.7' },
    ]);
  });
});

describe('formatAmount', () => {
  it.each([
    [10, '10'],
    [11.5, '11.5'],
    [12.65, '12.7'],
    [8.499999, '8.5'],
    [0.04, '0'],
  ])('shows %d as %s', (value, expected) => {
    expect(formatAmount(value)).toBe(expected);
  });
});
