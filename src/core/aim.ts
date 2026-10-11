import type { Vec2 } from './movement';

/** Aim used before the cursor has given a direction: to the right. */
export const DEFAULT_AIM: Vec2 = { x: 1, y: 0 };

/** Closer than this (in pixels) the cursor counts as being on the player. */
const MIN_AIM_DISTANCE = 1;

/**
 * Unit vector from the player towards the cursor. When the cursor is on the
 * player there is no direction to take, so the last aim is kept.
 */
export function aimDirection(player: Vec2, cursor: Vec2, lastAim: Vec2): Vec2 {
  const dx = cursor.x - player.x;
  const dy = cursor.y - player.y;
  const distance = Math.hypot(dx, dy);
  if (distance < MIN_AIM_DISTANCE) {
    return lastAim;
  }
  return { x: dx / distance, y: dy / distance };
}
