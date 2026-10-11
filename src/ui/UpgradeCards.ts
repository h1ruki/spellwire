import type Phaser from 'phaser';
import type { Card } from '../core/offers';
import { EMPTY_SLOT, type CardPreview, type PreviewLine } from '../core/preview';

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
  changes: readonly PreviewLine[];
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
      changes: preview.changes,
    };
  }
  const slot = card.part.slot;
  return {
    name: card.part.name,
    kind: `${slot.charAt(0).toUpperCase()}${slot.slice(1)}`,
    description: card.part.description,
    colour: card.part.colour,
    replaces: preview.replaces,
    changes: preview.changes,
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
    text(inner, y + 92, card.description, 15, TEXT_COLOUR).setWordWrapWidth(
      CARD.width - 2 * CARD.padding,
    );

    let lineY = y + 168;
    if (card.replaces !== null) {
      text(inner, lineY, replacesLine(card.replaces), 14, accent).setWordWrapWidth(
        CARD.width - 2 * CARD.padding,
      );
      lineY += 34;
    }
    for (const change of card.changes) {
      text(inner, lineY, change.label, 13, TEXT_DIM_COLOUR);
      text(inner, lineY + 17, `${change.before} → ${change.after}`, 17, TEXT_COLOUR);
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
  text(width / 2, 660, hint, 14, TEXT_DIM_COLOUR).setOrigin(0.5);
}
