import type { Vec2 } from './movement';

export interface Size {
  width: number;
  height: number;
}

/** An axis-aligned rectangle; `x` and `y` are its top-left corner. */
export interface Rect extends Size {
  x: number;
  y: number;
}

/** The part of the world on screen at once, in pixels. The world is larger and scrolls under it. */
export const VIEW: Size = { width: 1280, height: 720 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * The top-left corner of the view, in world coordinates, for a camera that
 * follows `target`.
 *
 * Away from the world's edges the target sits in the middle of the view. Near
 * an edge the view stops at it on that axis, so the target moves off centre,
 * by at most half the view when it reaches the edge itself. In a corner both
 * axes stop. The view never shows anything outside the world.
 */
export function cameraScroll(target: Vec2, view: Size, world: Size): Vec2 {
  return {
    x: clamp(target.x - view.width / 2, 0, Math.max(0, world.width - view.width)),
    y: clamp(target.y - view.height / 2, 0, Math.max(0, world.height - view.height)),
  };
}

/** The rectangle of the world that is on screen. */
export function viewRect(scroll: Vec2, view: Size): Rect {
  return { x: scroll.x, y: scroll.y, width: view.width, height: view.height };
}

/** Where a point on screen, such as the mouse cursor, is in the world. */
export function screenToWorld(screen: Vec2, scroll: Vec2): Vec2 {
  return { x: screen.x + scroll.x, y: screen.y + scroll.y };
}

/** Where a point in the world appears on screen. */
export function worldToScreen(world: Vec2, scroll: Vec2): Vec2 {
  return { x: world.x - scroll.x, y: world.y - scroll.y };
}

/** True when a point is more than `margin` outside a rectangle. */
export function isOutside(point: Vec2, rect: Rect, margin = 0): boolean {
  return (
    point.x < rect.x - margin ||
    point.x > rect.x + rect.width + margin ||
    point.y < rect.y - margin ||
    point.y > rect.y + rect.height + margin
  );
}
