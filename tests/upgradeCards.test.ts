import { describe, expect, it } from 'vitest';
import type { Card } from '../src/core/offers';
import { previewCard } from '../src/core/preview';
import { applyCard, createBuild } from '../src/core/upgrade';
import { cardView, offerSubtitle, replacesLine } from '../src/ui/UpgradeCards';
import { base, boost, fire, frost } from './shipped';

const FIRE: Card = { kind: 'part', part: fire };
const FROST: Card = { kind: 'part', part: frost };

describe('cardView', () => {
  it('shows a part with its name, slot, description, colour and preview', () => {
    const build = applyCard(createBuild(), FIRE).build;
    const preview = previewCard(FROST, build, base);
    expect(cardView(FROST, preview)).toEqual({
      name: frost.name,
      kind: 'Payload',
      description: frost.description,
      colour: frost.colour,
      replaces: 'Fire',
      changes: preview.changes,
    });
  });

  it('shows a boost as "Stat boost" with no slot line', () => {
    const card: Card = { kind: 'boost', boost: boost('fire-rate') };
    const view = cardView(card, previewCard(card, createBuild(), base));
    expect(view.kind).toBe('Stat boost');
    expect(view.replaces).toBeNull();
    expect(view.colour).toBeNull();
    expect(view.changes).toEqual([{ label: 'Fire rate', before: '3.0/s', after: '3.3/s' }]);
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
