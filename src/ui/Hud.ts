import type Phaser from 'phaser';

const MARGIN = 20;
const HEALTH_BAR = { width: 240, height: 16 };
const DASH_BAR = { width: 120, height: 8 };
const DASH_BAR_Y = MARGIN + HEALTH_BAR.height + 10;

const TRACK_COLOUR = 0x1c2238;
const HEALTH_COLOUR = 0x4ade80;
const HEALTH_LOW_COLOUR = 0xff5a5f;
const DASH_READY_COLOUR = 0x39e6ff;
const DASH_CHARGING_COLOUR = 0x4a5578;
const TEXT_COLOUR = '#dfe6ff';
const TEXT_DIM_COLOUR = '#7f8ab0';
const HUD_DEPTH = 100;

const LOW_HEALTH_FRACTION = 0.3;

/** Health bar, dash indicator and the death prompt. Display only. */
export class Hud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly dashText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bars = scene.add.graphics().setDepth(HUD_DEPTH);
    this.healthText = scene.add
      .text(MARGIN + HEALTH_BAR.width + 12, MARGIN + HEALTH_BAR.height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: TEXT_COLOUR,
      })
      .setOrigin(0, 0.5)
      .setDepth(HUD_DEPTH);
    this.dashText = scene.add
      .text(MARGIN + DASH_BAR.width + 12, DASH_BAR_Y + DASH_BAR.height / 2, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
      })
      .setOrigin(0, 0.5)
      .setDepth(HUD_DEPTH);
  }

  /** `dashReadiness` runs from 0 (just dashed) to 1 (ready). */
  update(health: number, maxHealth: number, dashReadiness: number): void {
    const healthFraction = Math.max(0, Math.min(1, health / maxHealth));
    const dashFraction = Math.max(0, Math.min(1, dashReadiness));
    const dashReady = dashFraction >= 1;

    this.bars.clear();
    this.bars.fillStyle(TRACK_COLOUR).fillRect(MARGIN, MARGIN, HEALTH_BAR.width, HEALTH_BAR.height);
    this.bars
      .fillStyle(healthFraction <= LOW_HEALTH_FRACTION ? HEALTH_LOW_COLOUR : HEALTH_COLOUR)
      .fillRect(MARGIN, MARGIN, HEALTH_BAR.width * healthFraction, HEALTH_BAR.height);
    this.bars.fillStyle(TRACK_COLOUR).fillRect(MARGIN, DASH_BAR_Y, DASH_BAR.width, DASH_BAR.height);
    this.bars
      .fillStyle(dashReady ? DASH_READY_COLOUR : DASH_CHARGING_COLOUR)
      .fillRect(MARGIN, DASH_BAR_Y, DASH_BAR.width * dashFraction, DASH_BAR.height);

    this.healthText.setText(`${Math.ceil(health)} / ${maxHealth}`);
    this.dashText
      .setText(dashReady ? 'DASH READY' : 'DASH')
      .setColor(dashReady ? TEXT_COLOUR : TEXT_DIM_COLOUR);
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
}
