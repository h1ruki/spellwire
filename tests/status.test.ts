import { describe, expect, it } from 'vitest';
import { createHealth, isDead, type HealthState } from '../src/core/health';
import {
  applyBurn,
  applyHitEffects,
  applySlow,
  createStatus,
  speedMultiplier,
  tickStatus,
  type StatusState,
} from '../src/core/status';

const BURN = { durationSeconds: 3, totalDamage: 12 };
const SLOW = { percent: 40, durationSeconds: 2 };
const TICK = 0.5;
const DT = 1 / 60;

interface Enemy {
  status: StatusState;
  health: HealthState;
}

/** Steps an enemy frame by frame and adds up what the burn did. */
function run(enemy: Enemy, seconds: number, dt = DT, onFrame?: (enemy: Enemy, t: number) => void) {
  let { status, health } = enemy;
  let damage = 0;
  let kills = 0;
  const frames = Math.round(seconds / dt);
  for (let frame = 0; frame < frames; frame++) {
    if (onFrame) {
      const changed = { status, health };
      onFrame(changed, frame * dt);
      status = changed.status;
    }
    const tick = tickStatus(status, health, TICK, dt);
    status = tick.status;
    health = tick.health;
    damage += tick.burnDamage;
    kills += tick.killed ? 1 : 0;
  }
  return { status, health, damage, kills };
}

const burning = (health = 1000): Enemy => ({
  status: applyBurn(createStatus(), BURN),
  health: createHealth(health),
});

describe('burn', () => {
  it('deals no damage before the first tick', () => {
    const result = run(burning(), 0.4);
    expect(result.damage).toBe(0);
    expect(result.health.current).toBe(1000);
  });

  it('deals damage in ticks, one per interval', () => {
    const afterOne = run(burning(), 0.6);
    expect(afterOne.damage).toBeCloseTo(2);
    expect(run(burning(), 1.6).damage).toBeCloseTo(6);
  });

  it('deals exactly its total damage over its duration, then expires', () => {
    const result = run(burning(), 3.2);
    expect(result.damage).toBeCloseTo(12);
    expect(result.health.current).toBeCloseTo(988);
    expect(result.status.burn).toBeNull();
    expect(run(result, 5).damage).toBe(0);
  });

  it.each([1 / 30, 1 / 144, 0.1, 0.7])('deals the same total at a frame time of %f s', (dt) => {
    expect(run(burning(), 5, dt).damage).toBeCloseTo(12);
  });

  it('deals its total even when the duration is not a whole number of ticks', () => {
    const enemy: Enemy = {
      status: applyBurn(createStatus(), { durationSeconds: 1.3, totalDamage: 13 }),
      health: createHealth(1000),
    };
    expect(run(enemy, 2).damage).toBeCloseTo(13);
  });

  it('refreshes instead of stacking: a second hit restarts the duration at the same strength', () => {
    const once = burning().status;
    const twice = applyBurn(once, BURN);
    expect(twice.burn?.damagePerSecond).toBe(once.burn?.damagePerSecond);
    expect(twice.burn?.remainingSeconds).toBe(3);

    // Re-hit at 2 s: the burn now ends at 5 s, having dealt 5 s worth, not two burns' worth.
    const result = run(burning(), 6, DT, (enemy, t) => {
      if (Math.abs(t - 2) < DT / 2) {
        enemy.status = applyBurn(enemy.status, BURN);
      }
    });
    expect(result.damage).toBeCloseTo(20);
    expect(result.status.burn).toBeNull();
  });

  it('keeps its tick progress when refreshed', () => {
    const partWay = run(burning(), 0.4);
    const refreshed = applyBurn(partWay.status, BURN);
    expect(refreshed.burn?.tickProgressSeconds).toBeCloseTo(0.4);
    // The tick that was 0.1 s away still lands on time.
    expect(run({ status: refreshed, health: partWay.health }, 0.15).damage).toBeCloseTo(2);
  });

  it('still burns under hits that land more often than the tick interval', () => {
    // A hit every 0.2 s for 6 s, well inside the 0.5 s tick.
    let nextHit = 0;
    const result = run(burning(), 6, DT, (enemy, t) => {
      if (t >= nextHit) {
        enemy.status = applyBurn(enemy.status, BURN);
        nextHit += 0.2;
      }
    });
    // 4 damage per second for 6 s, give or take the tick landing on the last frame.
    expect(result.damage).toBeGreaterThanOrEqual(22);
    expect(result.damage).toBeLessThanOrEqual(24);
    expect(result.status.burn).not.toBeNull();
  });

  it('takes the strength of the newest hit', () => {
    const stronger = applyBurn(burning().status, { durationSeconds: 3, totalDamage: 30 });
    expect(stronger.burn?.damagePerSecond).toBe(10);
  });

  it('reports a kill once, on the tick that kills', () => {
    const result = run(burning(5), 3.2);
    expect(isDead(result.health)).toBe(true);
    expect(result.kills).toBe(1);
  });

  it('does nothing more to an enemy it has killed', () => {
    const killed = run(burning(5), 3.2);
    const after = run(killed, 5);
    expect(after.kills).toBe(0);
    expect(after.damage).toBe(0);
    expect(after.health).toEqual(killed.health);
  });

  it('does nothing to an enemy that is already dead, even if it is still marked as burning', () => {
    const dead: Enemy = { status: burning().status, health: { ...createHealth(10), current: 0 } };
    const result = run(dead, 5);
    expect(result.kills).toBe(0);
    expect(result.damage).toBe(0);
    expect(result.status).toBe(dead.status);
  });

  it('clears the effects of an enemy it kills', () => {
    const enemy: Enemy = {
      status: applySlow(burning().status, SLOW),
      health: createHealth(1),
    };
    expect(run(enemy, 1).status).toEqual(createStatus());
  });
});

describe('slow', () => {
  it('leaves an unaffected enemy at full speed', () => {
    expect(speedMultiplier(createStatus())).toBe(1);
  });

  it('cuts speed by the given percentage', () => {
    expect(speedMultiplier(applySlow(createStatus(), SLOW))).toBeCloseTo(0.6);
  });

  it('lasts for its duration, then expires', () => {
    const slowed: Enemy = { status: applySlow(createStatus(), SLOW), health: createHealth(10) };
    expect(speedMultiplier(run(slowed, 1.9).status)).toBeCloseTo(0.6);
    const after = run(slowed, 2.1);
    expect(after.status.slow).toBeNull();
    expect(speedMultiplier(after.status)).toBe(1);
  });

  it('refreshes instead of stacking', () => {
    const slowed: Enemy = { status: applySlow(createStatus(), SLOW), health: createHealth(10) };
    const later = run(slowed, 1.5).status;
    const again = applySlow(later, SLOW);
    expect(speedMultiplier(again)).toBeCloseTo(0.6);
    expect(again.slow?.remainingSeconds).toBe(2);
  });

  it('deals no damage', () => {
    const slowed: Enemy = { status: applySlow(createStatus(), SLOW), health: createHealth(10) };
    const result = run(slowed, 3);
    expect(result.damage).toBe(0);
    expect(result.health.current).toBe(10);
  });
});

describe('applyHitEffects', () => {
  it('changes nothing for a plain shot', () => {
    const status = createStatus();
    expect(applyHitEffects(status, { burn: null, slow: null })).toBe(status);
  });

  it('applies the burn or slow a shot carries and keeps the other effect', () => {
    const burnt = applyHitEffects(createStatus(), { burn: BURN, slow: null });
    expect(burnt.burn).not.toBeNull();
    expect(burnt.slow).toBeNull();

    const both = applyHitEffects(burnt, { burn: null, slow: SLOW });
    expect(both.burn).toEqual(burnt.burn);
    expect(speedMultiplier(both)).toBeCloseTo(0.6);
  });
});
