export interface Vec2 {
  x: number;
  y: number;
}

/** Which movement keys are currently held: W = up, A = left, S = down, D = right. */
export interface MoveInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Position change for one frame, in screen coordinates (x grows right, y grows down).
 *
 * `speed` is in pixels per second and `deltaSeconds` is the frame time in seconds.
 * Opposite keys cancel out, and diagonals are normalised so they cover the same
 * distance as a straight move.
 */
export function movementDelta(input: MoveInput, speed: number, deltaSeconds: number): Vec2 {
  const dirX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dirY = (input.down ? 1 : 0) - (input.up ? 1 : 0);

  if (dirX === 0 && dirY === 0) {
    return { x: 0, y: 0 };
  }

  const distance = speed * deltaSeconds;
  const scale = dirX !== 0 && dirY !== 0 ? distance / Math.SQRT2 : distance;
  return { x: dirX * scale, y: dirY * scale };
}

/**
 * Keeps the centre of a body of the given size fully inside an arena whose
 * top-left corner is (0, 0).
 */
export function clampToArena(
  position: Vec2,
  bodySize: number,
  arenaWidth: number,
  arenaHeight: number,
): Vec2 {
  const half = bodySize / 2;
  return {
    x: Math.min(Math.max(position.x, half), arenaWidth - half),
    y: Math.min(Math.max(position.y, half), arenaHeight - half),
  };
}
