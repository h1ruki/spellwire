import Phaser from 'phaser';
import { loadGameData } from './core/data';
import { VIEW } from './core/camera';
import { ARENA_BACKGROUND, ArenaScene } from './game/ArenaScene';
import { UpgradeScene } from './game/UpgradeScene';

function start(): void {
  const data = loadGameData();

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: ARENA_BACKGROUND,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: VIEW.width,
      height: VIEW.height,
    },
    physics: { default: 'arcade' },
    // Only the first scene starts on its own; the arena launches the upgrade offer.
    scene: [new ArenaScene(data), new UpgradeScene()],
  });
}

try {
  start();
} catch (error) {
  // Show data mistakes on the page, not only in the console.
  const message = document.createElement('pre');
  message.id = 'error';
  message.textContent = error instanceof Error ? error.message : String(error);
  document.body.replaceChildren(message);
  throw error;
}
