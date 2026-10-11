import type { Vec2 } from './movement';

export interface DashTuning {
  /** Total distance covered by one dash, in pixels. */
  distance: number;
  /** How long the burst lasts, in seconds. */
  durationSeconds: number;
  /** Time from the start of a dash until the next one may start, in seconds. */
  cooldownSeconds: number;
}

export interface DashState {
  /** Seconds of burst left; 0 when not dashing. */
  activeSeconds: number;
  /** Seconds until another dash may start; 0 when ready. */
  cooldownSeconds: number;
  /** Direction locked when the current (or last) dash started. */
  direction: Vec2;
  /** Whether the dash key was held on the previous step. */
  keyWasHeld: boolean;
}

export interface DashInput {
  keyHeld: boolean;
  /** Unit vector of the held movement keys, or zero. */
  moveDirection: Vec2;
  /** Unit vector from the player towards the cursor. */
  aimDirection: Vec2;
}

export interface DashStep {
  state: DashState;
  /** True if the burst moved the player during this step. */
  dashing: boolean;
  /** Position change caused by the burst during this step. */
  displacement: Vec2;
}

export function createDashState(): DashState {
  return { activeSeconds: 0, cooldownSeconds: 0, direction: { x: 0, y: 0 }, keyWasHeld: false };
}

/** A dash follows the movement keys; with none held it goes towards the cursor. */
export function dashDirection(moveDirection: Vec2, aimDirection: Vec2): Vec2 {
  return moveDirection.x !== 0 || moveDirection.y !== 0 ? moveDirection : aimDirection;
}

export function isDashReady(state: DashState): boolean {
  return state.cooldownSeconds === 0 && state.activeSeconds === 0;
}

/** 0 just after a dash starts, rising to 1 when the next dash is available. */
export function dashReadiness(state: DashState, tuning: DashTuning): number {
  return 1 - state.cooldownSeconds / tuning.cooldownSeconds;
}

/**
 * Advances the dash by one frame.
 *
 * A dash starts only on a fresh key press while ready: pressing during the
 * cooldown does nothing, and a key that is still held when the cooldown ends
 * does not trigger one. The direction is locked for the whole burst. Dashing
 * only moves the player; it has no effect on damage.
 */
export function stepDash(
  state: DashState,
  input: DashInput,
  tuning: DashTuning,
  deltaSeconds: number,
): DashStep {
  let activeSeconds = state.activeSeconds;
  let cooldownSeconds = Math.max(0, state.cooldownSeconds - deltaSeconds);
  let direction = state.direction;

  const pressed = input.keyHeld && !state.keyWasHeld;
  if (pressed && cooldownSeconds === 0 && activeSeconds === 0) {
    activeSeconds = tuning.durationSeconds;
    cooldownSeconds = tuning.cooldownSeconds;
    direction = dashDirection(input.moveDirection, input.aimDirection);
  }

  const burstSeconds = Math.min(activeSeconds, deltaSeconds);
  const travelled = (tuning.distance / tuning.durationSeconds) * burstSeconds;

  return {
    state: {
      activeSeconds: activeSeconds - burstSeconds,
      cooldownSeconds,
      direction,
      keyWasHeld: input.keyHeld,
    },
    dashing: burstSeconds > 0,
    displacement: { x: direction.x * travelled, y: direction.y * travelled },
  };
}
