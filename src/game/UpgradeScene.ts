import Phaser from 'phaser';
import { drawOffer, type OfferView } from '../ui/UpgradeCards';

export const UPGRADE_SCENE = 'Upgrade';

export interface UpgradeSceneData {
  view: OfferView;
  onChoose: (index: number) => void;
  onSkip: () => void;
}

/**
 * The upgrade offer, shown over the arena while play is paused. It reports one
 * choice and then ignores further input; the arena stops it. Its listeners
 * belong to this scene, so stopping it removes them all.
 */
export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super(UPGRADE_SCENE);
  }

  create(data: UpgradeSceneData): void {
    let resolved = false;
    const once = (action: () => void): void => {
      if (!resolved) {
        resolved = true;
        action();
      }
    };
    const choose = (index: number): void => {
      if (index >= 0 && index < data.view.cards.length) {
        once(() => data.onChoose(index));
      }
    };
    const skip = (): void => once(data.onSkip);

    drawOffer(this, data.view, choose, skip);

    const { KeyCodes } = Phaser.Input.Keyboard;
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      // A key that was already held when the offer opened only sends repeats,
      // so it cannot choose or skip by accident.
      if (event.repeat) {
        return;
      }
      const code = event.keyCode;
      if (code === KeyCodes.X) {
        skip();
      } else if (code >= KeyCodes.ONE && code <= KeyCodes.THREE) {
        choose(code - KeyCodes.ONE);
      } else if (code >= KeyCodes.NUMPAD_ONE && code <= KeyCodes.NUMPAD_THREE) {
        choose(code - KeyCodes.NUMPAD_ONE);
      }
    });
  }
}
