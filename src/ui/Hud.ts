import type Phaser from 'phaser';

const MARGIN = 20;
/** The bar is `width` long at the starting maximum health and grows with it up to `maxWidth`. */
const HEALTH_BAR = { width: 200, maxWidth: 320, height: 16 };
const DASH_BAR = { width: 120, height: 8 };
const DASH_BAR_Y = MARGIN + HEALTH_BAR.height + 10;
const XP_BAR = { width: 400, height: 10 };

const TRACK_COLOUR = 0x1c2238;
const HEALTH_COLOUR = 0x4ade80;
const HEALTH_LOW_COLOUR = 0xff5a5f;
const DASH_READY_COLOUR = 0x39e6ff;
const DASH_CHARGING_COLOUR = 0x4a5578;
const XP_COLOUR = 0xffd23f;
const TEXT_COLOUR = '#dfe6ff';
const TEXT_DIM_COLOUR = '#7f8ab0';
const SLOT_ROW_HEIGHT = 20;
const SLOT_VALUE_X = MARGIN + 90;
const HUD_DEPTH = 100;

const LOW_HEALTH_FRACTION = 0.3;

export interface HudView {
  health: number;
  maxHealth: number;
  /** From 0 (just dashed) to 1 (ready). */
  dashReadiness: number;
  level: number;
  xp: number;
  xpForNextLevel: number;
  elapsedSeconds: number;
  /** Maximum health at the start of a run; the health bar is drawn relative to it. */
  baseMaxHealth: number;
  /** The loadout's slots, in display order. */
  slots: readonly SlotView[];
}

export interface SlotView {
  /** Slot name, e.g. "Payload". */
  label: string;
  /** Name of the installed part, or null when the slot is empty. */
  part: string | null;
  /** Hex colour of the installed part, or null when the slot is empty. */
  colour: string | null;
}

/** Width of the health bar in pixels: longer with more maximum health, up to a limit. */
export function healthBarWidth(maxHealth: number, baseMaxHealth: number): number {
  const width = HEALTH_BAR.width * (maxHealth / baseMaxHealth);
  return Math.max(0, Math.min(HEALTH_BAR.maxWidth, width));
}

/** Run time as minutes and seconds, e.g. 2:05. */
export function formatRunTime(elapsedSeconds: number): string {
  const whole = Math.floor(elapsedSeconds);
  const seconds = whole % 60;
  return `${Math.floor(whole / 60)}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** Health, dash, XP, level, run time, the loadout and the death prompt. Display only. */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly dashText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly slotLabels: Phaser.GameObjects.Text[] = [];
  private readonly slotValues: Phaser.GameObjects.Text[] = [];
  private readonly xpBarX: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width } = scene.scale;
    this.xpBarX = (width - XP_BAR.width) / 2;

    this.bars = scene.add.graphics().setDepth(HUD_DEPTH);
    this.healthText = this.label(0, MARGIN + HEALTH_BAR.height / 2, 16)
      .setOrigin(0, 0.5)
      .setColor(TEXT_COLOUR);
    this.dashText = this.label(
      MARGIN + DASH_BAR.width + 12,
      DASH_BAR_Y + DASH_BAR.height / 2,
      13,
    ).setOrigin(0, 0.5);
    this.levelText = this.label(width / 2, MARGIN + XP_BAR.height + 6, 14)
      .setOrigin(0.5, 0)
      .setColor(TEXT_COLOUR);
    this.timeText = this.label(width - MARGIN, MARGIN, 20)
      .setOrigin(1, 0)
      .setColor(TEXT_COLOUR);
  }

  update(view: HudView): void {
    const healthFraction = clamp01(view.health / view.maxHealth);
    const dashFraction = clamp01(view.dashReadiness);
    const xpFraction = clamp01(view.xp / view.xpForNextLevel);
    const dashReady = dashFraction >= 1;

    const healthBar = {
      width: healthBarWidth(view.maxHealth, view.baseMaxHealth),
      height: HEALTH_BAR.height,
    };

    this.bars.clear();
    this.bar(MARGIN, MARGIN, healthBar, healthFraction, healthColour(healthFraction));
    this.bar(
      MARGIN,
      DASH_BAR_Y,
      DASH_BAR,
      dashFraction,
      dashReady ? DASH_READY_COLOUR : DASH_CHARGING_COLOUR,
    );
    this.bar(this.xpBarX, MARGIN, XP_BAR, xpFraction, XP_COLOUR);

    this.healthText
      .setX(MARGIN + healthBar.width + 12)
      .setText(`${Math.ceil(view.health)} / ${Math.round(view.maxHealth)}`);
    this.dashText
      .setText(dashReady ? 'DASH READY' : 'DASH')
      .setColor(dashReady ? TEXT_COLOUR : TEXT_DIM_COLOUR);
    this.levelText.setText(
      `Level ${view.level}   ${Math.floor(view.xp)} / ${view.xpForNextLevel} XP`,
    );
    this.timeText.setText(formatRunTime(view.elapsedSeconds));
    this.updateSlots(view.slots);
  }

  /** One row per slot in the bottom-left corner: the slot name and what is in it. */
  private updateSlots(slots: readonly SlotView[]): void {
    const top = this.scene.scale.height - MARGIN - slots.length * SLOT_ROW_HEIGHT;
    slots.forEach((slot, index) => {
      const y = top + index * SLOT_ROW_HEIGHT;
      const label = (this.slotLabels[index] ??= this.label(MARGIN, y, 14).setColor(
        TEXT_DIM_COLOUR,
      ));
      const value = (this.slotValues[index] ??= this.label(SLOT_VALUE_X, y, 14));
      label.setText(slot.label.toUpperCase());
      value.setText(slot.part ?? 'Empty').setColor(slot.colour ?? TEXT_DIM_COLOUR);
    });
  }

  showDeathPrompt(): void {
    const { width, height } = this.scene.scale;
    this.scene.add
      .text(width / 2, height / 2, 'You died. Press R to restart.', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: TEXT_COLOUR,
        backgroundColor: '#0b0d17cc',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(HUD_DEPTH + 1);
  }

  private label(x: number, y: number, fontSize: number): Phaser.GameObjects.Text {
    return this.scene.add
      .text(x, y, '', { fontFamily: 'monospace', fontSize: `${fontSize}px` })
      .setDepth(HUD_DEPTH);
  }

  private bar(
    x: number,
    y: number,
    size: { width: number; height: number },
    fraction: number,
    colour: number,
  ): void {
    this.bars.fillStyle(TRACK_COLOUR).fillRect(x, y, size.width, size.height);
    this.bars.fillStyle(colour).fillRect(x, y, size.width * fraction, size.height);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function healthColour(healthFraction: number): number {
  return healthFraction <= LOW_HEALTH_FRACTION ? HEALTH_LOW_COLOUR : HEALTH_COLOUR;
}
