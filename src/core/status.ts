import { applyDamage, isDead, type HealthState } from './health';
import type { BurnSpec, SlowSpec } from './loadout';
import { stepRepeatingTimer } from './timer';

export interface BurnState {
  remainingSeconds: number;
  damagePerSecond: number;
  /** Time burnt since the last tick. Refreshing the burn keeps it. */
  tickProgressSeconds: number;
}

export interface SlowState {
  remainingSeconds: number;
  /** Multiplies the enemy's speed; below 1 while slowed. */
  speedMultiplier: number;
}

/** The elemental effects on one enemy; null means the effect is not active. */
export interface StatusState {
  burn: BurnState | null;
  slow: SlowState | null;
}

export function createStatus(): StatusState {
  return { burn: null, slow: null };
}

/**
 * Sets an enemy burning, or refreshes a burn already running: the duration
 * starts again and the newest hit sets the strength. Burns do not stack. The
 * progress towards the next tick is kept, so hits that land more often than
 * the tick interval cannot hold the next tick off.
 */
export function applyBurn(status: StatusState, burn: BurnSpec): StatusState {
  return {
    ...status,
    burn: {
      remainingSeconds: burn.durationSeconds,
      damagePerSecond: burn.totalDamage / burn.durationSeconds,
      tickProgressSeconds: status.burn?.tickProgressSeconds ?? 0,
    },
  };
}

/** Slows an enemy, or refreshes a slow already running. Slows do not stack. */
export function applySlow(status: StatusState, slow: SlowSpec): StatusState {
  return {
    ...status,
    slow: { remainingSeconds: slow.durationSeconds, speedMultiplier: 1 - slow.percent / 100 },
  };
}

/** Applies whatever a shot carries; a plain shot changes nothing. */
export function applyHitEffects(
  status: StatusState,
  effects: { burn: BurnSpec | null; slow: SlowSpec | null },
): StatusState {
  const burning = effects.burn ? applyBurn(status, effects.burn) : status;
  return effects.slow ? applySlow(burning, effects.slow) : burning;
}

/** 1 at full speed, lower while slowed. */
export function speedMultiplier(status: StatusState): number {
  return status.slow?.speedMultiplier ?? 1;
}

export interface StatusTick {
  status: StatusState;
  health: HealthState;
  /** Burn damage dealt during this step. */
  burnDamage: number;
  /** True only on the step in which the burn killed the enemy. */
  killed: boolean;
}

/**
 * Advances an enemy's burn and slow by one frame.
 *
 * A burn deals its damage in ticks, one per `tickIntervalSeconds`. When it runs
 * out, the part of a tick it had reached is dealt too, so a burn left alone
 * deals exactly its total damage. An enemy that is already dead is left
 * untouched, so a kill is reported once and later ticks do nothing.
 */
export function tickStatus(
  status: StatusState,
  health: HealthState,
  tickIntervalSeconds: number,
  deltaSeconds: number,
): StatusTick {
  if (isDead(health)) {
    return { status, health, burnDamage: 0, killed: false };
  }

  let burn = status.burn;
  let burnDamage = 0;
  if (burn) {
    const burntSeconds = Math.min(deltaSeconds, burn.remainingSeconds);
    const timer = stepRepeatingTimer(
      burn.tickProgressSeconds,
      tickIntervalSeconds,
      burntSeconds,
      Infinity,
    );
    const remainingSeconds = burn.remainingSeconds - burntSeconds;
    const expired = remainingSeconds <= 0;
    const damagingSeconds = timer.due * tickIntervalSeconds + (expired ? timer.elapsedSeconds : 0);
    burnDamage = burn.damagePerSecond * damagingSeconds;
    burn = expired
      ? null
      : { ...burn, remainingSeconds, tickProgressSeconds: timer.elapsedSeconds };
  }

  let slow = status.slow;
  if (slow) {
    const remainingSeconds = slow.remainingSeconds - deltaSeconds;
    slow = remainingSeconds <= 0 ? null : { ...slow, remainingSeconds };
  }

  const after = burnDamage > 0 ? applyDamage(health, burnDamage).state : health;
  if (isDead(after)) {
    return { status: createStatus(), health: after, burnDamage, killed: true };
  }
  return { status: { burn, slow }, health: after, burnDamage, killed: false };
}
