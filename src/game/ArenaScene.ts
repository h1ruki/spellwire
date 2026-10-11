import Phaser from 'phaser';
import type { GameData, PlayerConfig } from '../core/data';
import { clampToArena, movementDelta } from '../core/movement';

export const ARENA_WIDTH = 1280;
export const ARENA_HEIGHT = 720;
export const ARENA_BACKGROUND = '#0b0d17';

const ARENA_BORDER_COLOUR = 0x2a3050;

type MoveKeys = Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;

export class ArenaScene extends Phaser.Scene {
  private readonly gameData: GameData;
  private player!: Phaser.GameObjects.Graphics;
  private keys!: MoveKeys;

  constructor(data: GameData) {
    super('Arena');
    this.gameData = data;
  }

  create(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable.');
    }
    const { KeyCodes } = Phaser.Input.Keyboard;
    this.keys = {
      up: keyboard.addKey(KeyCodes.W),
      down: keyboard.addKey(KeyCodes.S),
      left: keyboard.addKey(KeyCodes.A),
      right: keyboard.addKey(KeyCodes.D),
    };

    this.add
      .graphics()
      .lineStyle(2, ARENA_BORDER_COLOUR)
      .strokeRect(1, 1, ARENA_WIDTH - 2, ARENA_HEIGHT - 2);

    this.player = drawPlayer(this.add.graphics(), this.gameData.player);
    this.player.setPosition(ARENA_WIDTH / 2, ARENA_HEIGHT / 2);
  }

  update(_time: number, deltaMs: number): void {
    const step = movementDelta(
      {
        up: this.keys.up.isDown,
        down: this.keys.down.isDown,
        left: this.keys.left.isDown,
        right: this.keys.right.isDown,
      },
      this.gameData.tuning.moveSpeed,
      deltaMs / 1000,
    );
    const next = clampToArena(
      { x: this.player.x + step.x, y: this.player.y + step.y },
      this.gameData.player.size,
      ARENA_WIDTH,
      ARENA_HEIGHT,
    );
    this.player.setPosition(next.x, next.y);
  }
}

/** Draws the player shape centred on the graphics object's origin. */
function drawPlayer(
  graphics: Phaser.GameObjects.Graphics,
  config: PlayerConfig,
): Phaser.GameObjects.Graphics {
  const half = config.size / 2;
  graphics.fillStyle(Phaser.Display.Color.HexStringToColor(config.colour).color);

  switch (config.shape) {
    case 'square':
      return graphics.fillRect(-half, -half, config.size, config.size);
    case 'circle':
      return graphics.fillCircle(0, 0, half);
    case 'triangle':
      return graphics.fillTriangle(0, -half, half, half, -half, half);
  }
}
