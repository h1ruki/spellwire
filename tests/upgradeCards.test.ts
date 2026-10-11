import { describe, expect, it } from 'vitest';
import type { Card } from '../src/core/offers';
import { previewCard } from '../src/core/preview';
import { applyCard, createBuild } from '../src/core/upgrade';
import {
  cardView,
  comparisonLine,
  offerSubtitle,
  replacesLine,
  TONE_LEGEND,
  TONE_STYLE,
} from '../src/ui/UpgradeCards';
import { base, boost, fire, frost } from './shipped';

const FIRE: Card = { kind: 'part', part: fire };
const FROST: Card = { kind: 'part', part: frost };

describe('cardView', () => {
  it('shows a part with its name, slot, description, colour and comparison', () => {
    const build = applyCard(createBuild(), FIRE).build;
    const preview = previewCard(FROST, build, base);
    expect(cardView(FROST, preview)).toEqual({
      name: frost.name,
      kind: 'Payload',
      description: frost.description,
      colour: frost.colour,
      replaces: 'Fire',
      comparisons: preview.comparisons,
    });
  });

  it('shows a boost as "Stat boost" with no slot line', () => {
    const card: Card = { kind: 'boost', boost: boost('fire-rate') };
    const view = cardView(card, previewCard(card, createBuild(), base));
    expect(view.kind).toBe('Stat boost');
    expect(view.replaces).toBeNull();
    expect(view.colour).toBeNull();
    expect(view.comparisons.map(comparisonLine)).toEqual(['▲ 3.0/s → 3.3/s']);
  });
});

describe('comparisonLine', () => {
  it('marks gains, losses and unchanged values with a symbol as well as a colour', () => {
    const build = applyCard(createBuild(), FIRE).build;
    const lines = previewCard(FROST, build, base).comparisons.map(comparisonLine);
    expect(lines).toEqual([
      '▼ 125% → 110%',
      '▼ Removed: 12 damage over 3 s',
      '▲ Added: 40% for 2 s',
    ]);
    expect(
      comparisonLine({
        label: 'Slow',
        tone: 'neutral',
        text: '40% for 2 s',
        before: '',
        after: '',
      }),
    ).toBe('= 40% for 2 s');
  });

  it('gives each tone its own symbol and colour, and explains the symbols', () => {
    const styles = Object.values(TONE_STYLE);
    expect(new Set(styles.map((style) => style.symbol)).size).toBe(3);
    expect(new Set(styles.map((style) => style.colour)).size).toBe(3);
    for (const style of styles) {
      expect(TONE_LEGEND).toContain(style.symbol);
    }
  });
});

describe('replacesLine', () => {
  it('says the slot is empty or names the part that will be lost', () => {
    expect(replacesLine('Empty')).toBe('Slot is empty');
    expect(replacesLine('Fire')).toBe('Replaces Fire (lost for this run)');
  });
});

describe('offerSubtitle', () => {
  it('mentions the offers still to come', () => {
    expect(offerSubtitle(0)).toBe('Choose an upgrade');
    expect(offerSubtitle(1)).toBe('Choose an upgrade (1 more level-up after this)');
    expect(offerSubtitle(2)).toBe('Choose an upgrade (2 more level-ups after this)');
  });
});
