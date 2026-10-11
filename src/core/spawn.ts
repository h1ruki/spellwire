import type { Rect, Size } from './camera';
import type { Vec2 } from './movement';

const MAX_ATTEMPTS = 30;

export interface SpawnRequest {
  /** How many enemies the group should contain. */
  count: number;
  /** The whole world; no enemy appears outside it. */
  world: Size;
  /** The part of the world on screen right now. */
  view: Rect;
  /**
   * How far beyond the edge of the view the group appears, in pixels, and how
   * far it stays from the edge of the world. The enemy's size keeps it fully
   * out of sight and fully inside the world.
   */
  margin: number;
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

/** A line along one side of the view that a group can line up on. */
interface SpawnLine {
  horizontal: boolean;
  /** The fixed coordinate of the line: y if horizontal, x if vertical. */
  at: number;
}

/**
 * The lines a group may appear on: one just beyond each side of the view,
 * leaving out any side where that would be outside the world. With the view
 * against a world edge the remaining sides are used; in a corner, two.
 *
 * Only if the world leaves no room beyond any side (it is no larger than the
 * view) do groups appear just inside the view's edges instead.
 */
function spawnLines(world: Size, view: Rect, margin: number): SpawnLine[] {
  const right = view.x + view.width;
  const bottom = view.y + view.height;
  const outside: SpawnLine[] = [
    { horizontal: true, at: view.y - margin },
    { horizontal: true, at: bottom + margin },
    { horizontal: false, at: view.x - margin },
    { horizontal: false, at: right + margin },
  ].filter(
    (line) =>
      line.at >= margin && line.at <= (line.horizontal ? world.height : world.width) - margin,
  );
  if (outside.length > 0) {
    return outside;
  }
  return [
    { horizontal: true, at: view.y + margin },
    { horizontal: true, at: bottom - margin },
    { horizontal: false, at: view.x + margin },
    { horizontal: false, at: right - margin },
  ];
}

/**
 * Positions for a group of enemies lined up just out of sight beyond a random
 * side of the view, inside the world.
 *
 * Every position is at least `minDistanceFromPlayer` from the player, wherever
 * on screen the player is. If no such place is found the result is empty and
 * the spawn is skipped. Enemies already in the world are never moved.
 */
export function spawnGroup(request: SpawnRequest): Vec2[] {
  const { count, world, view, margin, spacing, player } = request;
  const random = request.random ?? Math.random;
  if (count <= 0) {
    return [];
  }

  const lines = spawnLines(world, view, margin);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const line = lines[Math.min(lines.length - 1, Math.floor(random() * lines.length))];
    const along = random();
    if (!line) {
      return [];
    }

    const group: Vec2[] = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing;
      group.push(
        line.horizontal
          ? {
              x: clamp(view.x + along * view.width + offset, margin, world.width - margin),
              y: line.at,
            }
          : {
              x: line.at,
              y: clamp(view.y + along * view.height + offset, margin, world.height - margin),
            },
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
