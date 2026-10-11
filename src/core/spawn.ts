import type { Vec2 } from './movement';

const MAX_ATTEMPTS = 30;

export interface SpawnRequest {
  /** How many enemies the group should contain. */
  count: number;
  arenaWidth: number;
  arenaHeight: number;
  /** How far inside the arena edge the group appears, in pixels. */
  inset: number;
  /** Gap between neighbours in the group, in pixels. */
  spacing: number;
  player: Vec2;
  /** No enemy may appear closer to the player than this, in pixels. */
  minDistanceFromPlayer: number;
  /** Returns a number in [0, 1); defaults to Math.random. */
  random?: () => number;
}

/** How many more things may be added without exceeding a cap. */
export function roomUnderCap(wanted: number, current: number, cap: number): number {
  return Math.max(0, Math.min(wanted, cap - current));
}

/**
 * Positions for a group of enemies lined up just inside a random arena edge.
 *
 * Every position is at least `minDistanceFromPlayer` from the player. If no
 * such place is found the result is empty and the spawn is skipped.
 */
export function spawnGroup(request: SpawnRequest): Vec2[] {
  const { count, arenaWidth, arenaHeight, inset, spacing, player } = request;
  const random = request.random ?? Math.random;
  if (count <= 0) {
    return [];
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const edge = Math.min(3, Math.floor(random() * 4));
    const along = random();
    const horizontal = edge < 2;
    const anchor: Vec2 = horizontal
      ? {
          x: inset + along * (arenaWidth - 2 * inset),
          y: edge === 0 ? inset : arenaHeight - inset,
        }
      : {
          x: edge === 2 ? inset : arenaWidth - inset,
          y: inset + along * (arenaHeight - 2 * inset),
        };

    const group: Vec2[] = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing;
      group.push(
        horizontal
          ? { x: clamp(anchor.x + offset, inset, arenaWidth - inset), y: anchor.y }
          : { x: anchor.x, y: clamp(anchor.y + offset, inset, arenaHeight - inset) },
      );
    }

    const farEnough = group.every(
      (p) => Math.hypot(p.x - player.x, p.y - player.y) >= request.minDistanceFromPlayer,
    );
    if (farEnough) {
      return group;
    }
  }
  return [];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
