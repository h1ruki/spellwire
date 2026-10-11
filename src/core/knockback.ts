import type { Vec2 } from './movement';

/**
 * How far a hit pushes an enemy.
 *
 * `hitDirection` is the direction the projectile was travelling (any length).
 * `strength` is the push in pixels against no resistance. `resistance` runs
 * from 0 (pushed the full distance) to 1 (not pushed at all).
 */
export function knockbackDisplacement(
  hitDirection: Vec2,
  strength: number,
  resistance: number,
): Vec2 {
  const length = Math.hypot(hitDirection.x, hitDirection.y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  const distance = strength * (1 - Math.min(Math.max(resistance, 0), 1));
  return {
    x: (hitDirection.x / length) * distance,
    y: (hitDirection.y / length) * distance,
  };
}
