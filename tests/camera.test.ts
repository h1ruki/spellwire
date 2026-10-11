import { describe, expect, it } from 'vitest';
import { aimDirection, DEFAULT_AIM } from '../src/core/aim';
import {
  cameraScroll,
  isOutside,
  screenToWorld,
  VIEW,
  viewRect,
  worldToScreen,
} from '../src/core/camera';
import { createDashState, stepDash } from '../src/core/dash';
import { clampToArena, movementDelta, type Vec2 } from '../src/core/movement';
import { shipped } from './shipped';

const WORLD = shipped.tuning.world;
const PLAYER_SIZE = shipped.player.size;
const HALF = PLAYER_SIZE / 2;
const MAX_SCROLL = { x: WORLD.width - VIEW.width, y: WORLD.height - VIEW.height };

/** Where the player appears on screen for a given place in the world. */
const onScreen = (player: Vec2): Vec2 => worldToScreen(player, cameraScroll(player, VIEW, WORLD));
const confine = (position: Vec2): Vec2 =>
  clampToArena(position, PLAYER_SIZE, WORLD.width, WORLD.height);

describe('the shipped world', () => {
  it('keeps the logical view at 1280 by 720', () => {
    expect(VIEW).toEqual({ width: 1280, height: 720 });
  });

  it('is clearly larger than the view on both axes', () => {
    expect(WORLD.width).toBeGreaterThanOrEqual(VIEW.width * 2);
    expect(WORLD.height).toBeGreaterThanOrEqual(VIEW.height * 2);
  });

  it('starts the player, at its centre, away from every boundary', () => {
    const start = { x: WORLD.width / 2, y: WORLD.height / 2 };
    const scroll = cameraScroll(start, VIEW, WORLD);
    expect(scroll.x).toBeGreaterThan(0);
    expect(scroll.x).toBeLessThan(MAX_SCROLL.x);
    expect(scroll.y).toBeGreaterThan(0);
    expect(scroll.y).toBeLessThan(MAX_SCROLL.y);
    expect(onScreen(start)).toEqual({ x: VIEW.width / 2, y: VIEW.height / 2 });
  });
});

describe('cameraScroll', () => {
  it.each([
    [{ x: 1920, y: 1080 }],
    [{ x: 700, y: 400 }],
    [{ x: 3100, y: 1700 }],
    [{ x: VIEW.width / 2, y: VIEW.height / 2 }],
    [{ x: WORLD.width - VIEW.width / 2, y: WORLD.height - VIEW.height / 2 }],
  ])('keeps a player at %j exactly centred away from the boundaries', (player) => {
    expect(onScreen(player)).toEqual({ x: VIEW.width / 2, y: VIEW.height / 2 });
  });

  it('follows movement one for one while centred', () => {
    const a = cameraScroll({ x: 1500, y: 900 }, VIEW, WORLD);
    const b = cameraScroll({ x: 1537, y: 880 }, VIEW, WORLD);
    expect({ x: b.x - a.x, y: b.y - a.y }).toEqual({ x: 37, y: -20 });
  });

  it.each([
    ['left', { x: 100, y: 1080 }, { x: 0, y: 720 }],
    ['right', { x: WORLD.width - 100, y: 1080 }, { x: MAX_SCROLL.x, y: 720 }],
    ['top', { x: 1920, y: 100 }, { x: 1280, y: 0 }],
    ['bottom', { x: 1920, y: WORLD.height - 100 }, { x: 1280, y: MAX_SCROLL.y }],
  ])('stops at the %s boundary and keeps following on the other axis', (_name, player, scroll) => {
    expect(cameraScroll(player, VIEW, WORLD)).toEqual(scroll);
  });

  it.each([
    ['top-left', { x: 50, y: 50 }, { x: 0, y: 0 }],
    ['top-right', { x: WORLD.width - 50, y: 50 }, { x: MAX_SCROLL.x, y: 0 }],
    ['bottom-left', { x: 50, y: WORLD.height - 50 }, { x: 0, y: MAX_SCROLL.y }],
    ['bottom-right', { x: WORLD.width - 50, y: WORLD.height - 50 }, MAX_SCROLL],
  ])('stops on both axes in the %s corner', (_name, player, scroll) => {
    expect(cameraScroll(player, VIEW, WORLD)).toEqual(scroll);
  });

  it('lets the player move off centre once the view has stopped', () => {
    expect(onScreen({ x: 300, y: 1080 })).toEqual({ x: 300, y: 360 });
    expect(onScreen({ x: WORLD.width - 300, y: 1080 })).toEqual({ x: VIEW.width - 300, y: 360 });
    expect(onScreen({ x: 1920, y: 200 })).toEqual({ x: 640, y: 200 });
  });

  it('at the very edge of the world the player is half a view from centre, at the screen edge', () => {
    const corners = [
      confine({ x: -500, y: -500 }),
      confine({ x: WORLD.width + 500, y: -500 }),
      confine({ x: -500, y: WORLD.height + 500 }),
      confine({ x: WORLD.width + 500, y: WORLD.height + 500 }),
    ];
    for (const corner of corners) {
      const screen = onScreen(corner);
      // The player's centre stops half its size short of the edge.
      expect(Math.abs(screen.x - VIEW.width / 2)).toBe(VIEW.width / 2 - HALF);
      expect(Math.abs(screen.y - VIEW.height / 2)).toBe(VIEW.height / 2 - HALF);
    }
    // A point exactly on the boundary is exactly half a view from centre.
    expect(onScreen({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(onScreen({ x: WORLD.width, y: WORLD.height })).toEqual({
      x: VIEW.width,
      y: VIEW.height,
    });
  });

  it('never shows anything outside the world, wherever the player is', () => {
    for (let x = -200; x <= WORLD.width + 200; x += 97) {
      for (let y = -200; y <= WORLD.height + 200; y += 89) {
        const view = viewRect(cameraScroll({ x, y }, VIEW, WORLD), VIEW);
        expect(view.x).toBeGreaterThanOrEqual(0);
        expect(view.y).toBeGreaterThanOrEqual(0);
        expect(view.x + view.width).toBeLessThanOrEqual(WORLD.width);
        expect(view.y + view.height).toBeLessThanOrEqual(WORLD.height);
      }
    }
  });

  it('keeps a confined player on screen everywhere', () => {
    for (let x = -200; x <= WORLD.width + 200; x += 97) {
      for (let y = -200; y <= WORLD.height + 200; y += 89) {
        const screen = onScreen(confine({ x, y }));
        expect(screen.x).toBeGreaterThanOrEqual(HALF);
        expect(screen.x).toBeLessThanOrEqual(VIEW.width - HALF);
        expect(screen.y).toBeGreaterThanOrEqual(HALF);
        expect(screen.y).toBeLessThanOrEqual(VIEW.height - HALF);
      }
    }
  });

  it('does not scroll at all in a world the size of the view', () => {
    expect(cameraScroll({ x: 900, y: 100 }, VIEW, VIEW)).toEqual({ x: 0, y: 0 });
  });
});

describe('confining the player to the world', () => {
  it('stops walking at each boundary, with the whole player inside', () => {
    let position = { x: 60, y: 60 };
    for (let frame = 0; frame < 120; frame++) {
      const step = movementDelta(
        { up: true, down: false, left: true, right: false },
        shipped.tuning.moveSpeed,
        1 / 60,
      );
      position = confine({ x: position.x + step.x, y: position.y + step.y });
    }
    expect(position).toEqual({ x: HALF, y: HALF });
  });

  it.each([
    ['left', { x: -1, y: 0 }, { x: 60, y: 1080 }],
    ['right', { x: 1, y: 0 }, { x: WORLD.width - 60, y: 1080 }],
    ['up', { x: 0, y: -1 }, { x: 1920, y: 60 }],
    ['down', { x: 0, y: 1 }, { x: 1920, y: WORLD.height - 60 }],
  ])('a dash %s into the boundary cannot leave the world', (_name, direction, start) => {
    let dash = createDashState();
    let position = start;
    for (let frame = 0; frame < 30; frame++) {
      const step = stepDash(
        dash,
        { keyHeld: frame === 0, moveDirection: direction, aimDirection: direction },
        shipped.tuning.dash,
        1 / 60,
      );
      dash = step.state;
      position = confine({
        x: position.x + step.displacement.x,
        y: position.y + step.displacement.y,
      });
      expect(position.x).toBeGreaterThanOrEqual(HALF);
      expect(position.x).toBeLessThanOrEqual(WORLD.width - HALF);
      expect(position.y).toBeGreaterThanOrEqual(HALF);
      expect(position.y).toBeLessThanOrEqual(WORLD.height - HALF);
    }
    // The dash was long enough to reach the boundary, and stopped there.
    const reached =
      position.x === HALF ||
      position.x === WORLD.width - HALF ||
      position.y === HALF ||
      position.y === WORLD.height - HALF;
    expect(reached).toBe(true);
  });
});

describe('screen and world coordinates', () => {
  it('convert both ways', () => {
    const scroll = { x: 1280, y: 720 };
    expect(screenToWorld({ x: 100, y: 50 }, scroll)).toEqual({ x: 1380, y: 770 });
    expect(worldToScreen({ x: 1380, y: 770 }, scroll)).toEqual({ x: 100, y: 50 });
  });

  it('are the same thing before the camera has scrolled', () => {
    expect(screenToWorld({ x: 100, y: 50 }, { x: 0, y: 0 })).toEqual({ x: 100, y: 50 });
  });
});

describe('aiming after the camera has scrolled', () => {
  const aimAt = (player: Vec2, cursorOnScreen: Vec2): Vec2 =>
    aimDirection(
      player,
      screenToWorld(cursorOnScreen, cameraScroll(player, VIEW, WORLD)),
      DEFAULT_AIM,
    );

  it('aims at the cursor, not at its stale place in the world', () => {
    // The player is far from the origin and centred; the cursor is right of centre.
    const aim = aimAt({ x: 3000, y: 1500 }, { x: 1040, y: 360 });
    expect(aim.x).toBeCloseTo(1);
    expect(aim.y).toBeCloseTo(0);
    // Without the conversion the cursor would seem to be far up and to the left.
    const stale = aimDirection({ x: 3000, y: 1500 }, { x: 1040, y: 360 }, DEFAULT_AIM);
    expect(stale.x).toBeLessThan(0);
  });

  it('gives the same direction anywhere in the open world for the same cursor', () => {
    const cursor = { x: 240, y: 660 };
    const first = aimAt({ x: 700, y: 400 }, cursor);
    const second = aimAt({ x: 3100, y: 1700 }, cursor);
    expect(second.x).toBeCloseTo(first.x);
    expect(second.y).toBeCloseTo(first.y);
  });

  it('follows the player off centre at a boundary', () => {
    // In the bottom-right corner the player is drawn near the screen's corner.
    const player = confine({ x: WORLD.width, y: WORLD.height });
    const screen = onScreen(player);
    const aim = aimAt(player, { x: screen.x - 300, y: screen.y });
    expect(aim.x).toBeCloseTo(-1);
    expect(aim.y).toBeCloseTo(0);
  });

  it('changes as the camera moves under a cursor that stays still', () => {
    const cursor = { x: 640, y: 100 };
    // Centred: the cursor is straight above. Against the left wall it is up and to the right.
    expect(aimAt({ x: 1920, y: 1080 }, cursor).x).toBeCloseTo(0);
    expect(aimAt({ x: 100, y: 1080 }, cursor).x).toBeGreaterThan(0.5);
  });
});

describe('isOutside', () => {
  const rect = { x: 100, y: 200, width: 300, height: 100 };

  it('is false inside and on the edge', () => {
    expect(isOutside({ x: 250, y: 250 }, rect)).toBe(false);
    expect(isOutside({ x: 100, y: 200 }, rect)).toBe(false);
    expect(isOutside({ x: 400, y: 300 }, rect)).toBe(false);
  });

  it('is true beyond any side', () => {
    expect(isOutside({ x: 99, y: 250 }, rect)).toBe(true);
    expect(isOutside({ x: 401, y: 250 }, rect)).toBe(true);
    expect(isOutside({ x: 250, y: 199 }, rect)).toBe(true);
    expect(isOutside({ x: 250, y: 301 }, rect)).toBe(true);
  });

  it('allows a margin', () => {
    expect(isOutside({ x: 60, y: 250 }, rect, 64)).toBe(false);
    expect(isOutside({ x: 30, y: 250 }, rect, 64)).toBe(true);
  });
});
