import type Phaser from 'phaser';
import type { Card } from '../core/offers';
import { EMPTY_SLOT, type CardPreview, type Comparison, type Tone } from '../core/preview';

const CARD = { width: 340, height: 380, gap: 30, top: 150, padding: 20 };
const SKIP_BUTTON = { width: 440, height: 56, y: 598 };

const BACKDROP_COLOUR = 0x05060c;
const BACKDROP_ALPHA = 0.8;
const CARD_COLOUR = 0x141a2e;
const CARD_BORDER_COLOUR = 0x2a3050;
const HOVER_BORDER_COLOUR = 0xdfe6ff;
const BOOST_COLOUR = '#7f8ab0';
const TEXT_COLOUR = '#dfe6ff';
const TEXT_DIM_COLOUR = '#7f8ab0';
const TITLE_COLOUR = '#ffd23f';

/**
 * How each kind of change is marked. The symbol says the same as the colour,
 * so the comparison does not depend on telling green from red.
 */
export const TONE_STYLE: Readonly<Record<Tone, { symbol: string; colour: string }>> = {
  gain: { symbol: '▲', colour: '#4ade80' },
  loss: { symbol: '▼', colour: '#ff6b70' },
  neutral: { symbol: '=', colour: '#b4bcdc' },
};

/** Explains the symbols under the cards. */
export const TONE_LEGEND = `${TONE_STYLE.gain.symbol} better   ${TONE_STYLE.loss.symbol} worse   ${TONE_STYLE.neutral.symbol} unchanged`;

/** One card as it is drawn. */
export interface CardView {
  name: string;
  /** The slot the part goes into, or "Stat boost". */
  kind: string;
  description: string;
  /** Hex colour of the part; null for a stat boost. */
  colour: string | null;
  /** For a part, what happens to its slot; null for a stat boost. */
  replaces: string | null;
  comparisons: readonly Comparison[];
}

export interface OfferView {
  /** The level this offer is for. */
  level: number;
  cards: readonly CardView[];
  /** Health restored by skipping. */
  skipHeal: number;
  /** Level-ups still to be chosen after this one. */
  waiting: number;
}

/** Turns a card and its preview into the words shown on it. */
export function cardView(card: Card, preview: CardPreview): CardView {
  if (card.kind === 'boost') {
    return {
      name: card.boost.name,
      kind: 'Stat boost',
      description: card.boost.description,
      colour: null,
      replaces: null,
      comparisons: preview.comparisons,
    };
  }
  const slot = card.part.slot;
  return {
    name: card.part.name,
    kind: `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`,
    description: card.part.description,
    colour: card.part.colour,
    replaces: preview.replaces,
    comparisons: preview.comparisons,
  };
}

/** The line under the title, e.g. how many more offers follow this one. */
export function offerSubtitle(waiting: number): string {
  if (waiting <= 0) {
    return 'Choose an upgrade';
  }
  return `Choose an upgrade (${waiting} more level-up${waiting === 1 ? '' : 's'} after this)`;
}

/** Text for the slot line of a part card. */
export function replacesLine(replaces: string): string {
  return replaces === EMPTY_SLOT ? 'Slot is empty' : `Replaces ${replaces} (lost for this run)`;
}

/** A comparison as one line of text, led by the symbol for its tone. */
export function comparisonLine(comparison: Comparison): string {
  return `${TONE_STYLE[comparison.tone].symbol} ${comparison.text}`;
}

function colourNumber(hex: string): number {
  return parseInt(hex.slice(1), 16);
}

/**
 * Draws an upgrade offer: up to three cards and the Skip button. A press on a
 * card or on Skip calls back; the caller handles the keyboard. Display only.
 */
export function drawOffer(
  scene: Phaser.Scene,
  view: OfferView,
  onChoose: (index: number) => void,
  onSkip: () => void,
): void {
  const { width, height } = scene.scale;
  const text = (x: number, y: number, value: string, size: number, colour: string) =>
    scene.add.text(x, y, value, { fontFamily: 'monospace', fontSize: `${size}px`, color: colour });

  scene.add.rectangle(width / 2, height / 2, width, height, BACKDROP_COLOUR, BACKDROP_ALPHA);
  text(width / 2, 70, `LEVEL ${view.level}`, 36, TITLE_COLOUR).setOrigin(0.5);
  text(width / 2, 112, offerSubtitle(view.waiting), 16, TEXT_COLOUR).setOrigin(0.5);

  const count = view.cards.length;
  const left = (width - (count * CARD.width + (count - 1) * CARD.gap)) / 2;
  const innerWidth = CARD.width - 2 * CARD.padding;
  view.cards.forEach((card, index) => {
    const x = left + index * (CARD.width + CARD.gap);
    const y = CARD.top;
    const accent = card.colour ?? BOOST_COLOUR;

    const panel = scene.add
      .rectangle(x, y, CARD.width, CARD.height, CARD_COLOUR)
      .setOrigin(0)
      .setStrokeStyle(2, CARD_BORDER_COLOUR)
      .setInteractive({ useHandCursor: true });
    panel.on('pointerover', () => panel.setStrokeStyle(3, HOVER_BORDER_COLOUR));
    panel.on('pointerout', () => panel.setStrokeStyle(2, CARD_BORDER_COLOUR));
    panel.on('pointerdown', () => onChoose(index));

    scene.add.rectangle(x, y, CARD.width, 8, colourNumber(accent)).setOrigin(0);
    const inner = x + CARD.padding;
    text(x + CARD.width - CARD.padding, y + 24, `[${index + 1}]`, 16, TEXT_DIM_COLOUR).setOrigin(
      1,
      0,
    );
    text(inner, y + 24, card.name, 28, card.colour ?? TEXT_COLOUR);
    text(inner, y + 64, card.kind.toUpperCase(), 13, TEXT_DIM_COLOUR);
    text(inner, y + 92, card.description, 15, TEXT_COLOUR).setWordWrapWidth(innerWidth);

    let lineY = y + 160;
    if (card.replaces !== null) {
      text(inner, lineY, replacesLine(card.replaces), 14, accent).setWordWrapWidth(innerWidth);
      lineY += 34;
    }
    for (const comparison of card.comparisons) {
      text(inner, lineY, comparison.label, 13, TEXT_DIM_COLOUR);
      text(
        inner,
        lineY + 17,
        comparisonLine(comparison),
        16,
        TONE_STYLE[comparison.tone].colour,
      ).setWordWrapWidth(innerWidth);
      lineY += 50;
    }
  });

  const skip = scene.add
    .rectangle(width / 2, SKIP_BUTTON.y, SKIP_BUTTON.width, SKIP_BUTTON.height, CARD_COLOUR)
    .setStrokeStyle(2, CARD_BORDER_COLOUR)
    .setInteractive({ useHandCursor: true });
  skip.on('pointerover', () => skip.setStrokeStyle(3, HOVER_BORDER_COLOUR));
  skip.on('pointerout', () => skip.setStrokeStyle(2, CARD_BORDER_COLOUR));
  skip.on('pointerdown', onSkip);
  text(
    width / 2,
    SKIP_BUTTON.y,
    `[X] Skip and restore ${view.skipHeal} health`,
    18,
    TEXT_COLOUR,
  ).setOrigin(0.5);

  const keys = count > 1 ? `1-${count}` : '1';
  const hint = count > 0 ? `Click a card or press ${keys}. Press X to skip.` : 'Press X to skip.';
  text(width / 2, 652, hint, 14, TEXT_DIM_COLOUR).setOrigin(0.5);
  if (view.cards.some((card) => card.comparisons.length > 0)) {
    text(width / 2, 678, TONE_LEGEND, 14, TEXT_DIM_COLOUR).setOrigin(0.5);
  }
}
