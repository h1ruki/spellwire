import type { Vec2 } from './movement';

/** Velocity of the given speed pointing from an enemy straight at its target. */
export function chaseVelocity(enemy: Vec2, target: Vec2, speed: number): Vec2 {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const distance = Math.hypot(dx, dy);
  if (distance === 0) {
    return { x: 0, y: 0 };
  }
  return { x: (dx / distance) * speed, y: (dy / distance) * speed };
}
