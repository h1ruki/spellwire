export interface HealthState {
  current: number;
  max: number;
  /** Seconds of post-hit invulnerability left; 0 when vulnerable. */
  invulnerableSeconds: number;
}

export interface DamageResult {
  state: HealthState;
  /** False when the hit was ignored. */
  damaged: boolean;
}

export function createHealth(max: number): HealthState {
  return { current: max, max, invulnerableSeconds: 0 };
}

export function isDead(state: HealthState): boolean {
  return state.current <= 0;
}

export function isInvulnerable(state: HealthState): boolean {
  return state.invulnerableSeconds > 0;
}

/** Counts down the post-hit invulnerability. */
export function stepHealth(state: HealthState, deltaSeconds: number): HealthState {
  return {
    ...state,
    invulnerableSeconds: Math.max(0, state.invulnerableSeconds - deltaSeconds),
  };
}

/**
 * Applies a hit. Health never drops below 0. A hit that lands starts the
 * post-hit invulnerability window, during which further hits are ignored.
 * This window is the only source of invulnerability.
 */
export function applyDamage(
  state: HealthState,
  amount: number,
  invulnerabilitySeconds = 0,
): DamageResult {
  if (isDead(state) || isInvulnerable(state)) {
    return { state, damaged: false };
  }
  return {
    state: {
      ...state,
      current: Math.max(0, state.current - amount),
      invulnerableSeconds: invulnerabilitySeconds,
    },
    damaged: true,
  };
}

/** Restores health, never above the maximum. The dead are not revived. */
export function heal(state: HealthState, amount: number): HealthState {
  if (isDead(state)) {
    return state;
  }
  return { ...state, current: Math.min(state.max, state.current + Math.max(0, amount)) };
}

/**
 * Changes the maximum health. Current health moves by the same amount, so a
 * larger maximum is felt at once, and never ends above the new maximum.
 */
export function withMaxHealth(state: HealthState, max: number): HealthState {
  const current = Math.min(max, Math.max(0, state.current + (max - state.max)));
  return { ...state, current, max };
}
