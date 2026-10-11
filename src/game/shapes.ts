import Phaser from 'phaser';
import type { Shape } from '../core/data';

export function colourToNumber(hex: string): number {
  return Phaser.Display.Color.HexStringToColor(hex).color;
}

/**
 * Creates a square texture of the given size holding a filled shape, unless a
 * texture with that key already exists (textures survive a scene restart).
 */
export function ensureShapeTexture(
  scene: Phaser.Scene,
  key: string,
  shape: Shape,
  colour: string,
  size: number,
): void {
  if (scene.textures.exists(key)) {
    return;
  }
  const half = size / 2;
  const graphics = scene.make.graphics({}, false);
  graphics.fillStyle(colourToNumber(colour));

  switch (shape) {
    case 'square':
      graphics.fillRect(0, 0, size, size);
      break;
    case 'circle':
      graphics.fillCircle(half, half, half);
      break;
    case 'triangle':
      graphics.fillTriangle(half, 0, size, size, 0, size);
      break;
    case 'hexagon': {
      const corners = Array.from({ length: 6 }, (_, corner) => {
        const angle = (Math.PI / 3) * corner;
        return { x: half + half * Math.cos(angle), y: half + half * Math.sin(angle) };
      });
      graphics.fillPoints(corners, true);
      break;
    }
  }

  graphics.generateTexture(key, size, size);
  graphics.destroy();
}
