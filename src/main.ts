import Phaser from 'phaser';
import { loadGameData } from './core/data';
import { ARENA_BACKGROUND, ARENA_HEIGHT, ARENA_WIDTH, ArenaScene } from './game/ArenaScene';

function start(): void {
  const data = loadGameData();

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: ARENA_BACKGROUND,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
    },
    scene: new ArenaScene(data),
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
