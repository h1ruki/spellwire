import type Phaser from 'phaser';

const MARGIN = 20;
const HEALTH_BAR = { width: 240, height: 16 };
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
const NOTICE_COLOUR = '#ffd23f';
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
  /** The "Level N" notice, with `opacity` from 0 to 1, or null when hidden. */
  levelNotice: { level: number; opacity: number } | null;
}

/** Run time as minutes and seconds, e.g. 2:05. */
export function formatRunTime(elapsedSeconds: number): string {
  const whole = Math.floor(elapsedSeconds);
  const seconds = whole % 60;
  return `${Math.floor(whole / 60)}:${seconds < 10 ? '0' : ''}${seconds}`;
}

/** Health, dash, XP, level, run time and the death prompt. Display only. */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly dashText: Phaser.GameObjects.Text;
  private readonly levelText: Phaser.GameObjects.Text;
  private readonly timeText: Phaser.GameObjects.Text;
  private readonly noticeText: Phaser.GameObjects.Text;
  private readonly xpBarX: number;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.xpBarX = (width - XP_BAR.width) / 2;

    this.bars = scene.add.graphics().setDepth(HUD_DEPTH);
    this.healthText = this.label(MARGIN + HEALTH_BAR.width + 12, MARGIN + HEALTH_BAR.height / 2, 16)
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
    this.noticeText = this.label(width / 2, height * 0.28, 40)
      .setOrigin(0.5)
      .setColor(NOTICE_COLOUR)
      .setVisible(false);
  }

  update(view: HudView): void {
    const healthFraction = clamp01(view.health / view.maxHealth);
    const dashFraction = clamp01(view.dashReadiness);
    const xpFraction = clamp01(view.xp / view.xpForNextLevel);
    const dashReady = dashFraction >= 1;

    this.bars.clear();
    this.bar(MARGIN, MARGIN, HEALTH_BAR, healthFraction, healthColour(healthFraction));
    this.bar(
      MARGIN,
      DASH_BAR_Y,
      DASH_BAR,
      dashFraction,
      dashReady ? DASH_READY_COLOUR : DASH_CHARGING_COLOUR,
    );
    this.bar(this.xpBarX, MARGIN, XP_BAR, xpFraction, XP_COLOUR);

    this.healthText.setText(`${Math.ceil(view.health)} / ${view.maxHealth}`);
    this.dashText
      .setText(dashReady ? 'DASH READY' : 'DASH')
      .setColor(dashReady ? TEXT_COLOUR : TEXT_DIM_COLOUR);
    this.levelText.setText(
      `Level ${view.level}   ${Math.floor(view.xp)} / ${view.xpForNextLevel} XP`,
    );
    this.timeText.setText(formatRunTime(view.elapsedSeconds));

    if (view.levelNotice) {
      this.noticeText
        .setText(`Level ${view.levelNotice.level}`)
        .setAlpha(clamp01(view.levelNotice.opacity))
        .setVisible(true);
    } else {
      this.noticeText.setVisible(false);
    }
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
