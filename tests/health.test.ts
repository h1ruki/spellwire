import { describe, expect, it } from 'vitest';
import { applyDamage, createHealth, isDead, isInvulnerable, stepHealth } from '../src/core/health';

const INVULNERABILITY = 0.8;

describe('health', () => {
  it('starts full, alive and vulnerable', () => {
    const health = createHealth(100);
    expect(health).toEqual({ current: 100, max: 100, invulnerableSeconds: 0 });
    expect(isDead(health)).toBe(false);
    expect(isInvulnerable(health)).toBe(false);
  });

  it('takes damage and starts the invulnerability window', () => {
    const hit = applyDamage(createHealth(100), 10, INVULNERABILITY);
    expect(hit.damaged).toBe(true);
    expect(hit.state.current).toBe(90);
    expect(isInvulnerable(hit.state)).toBe(true);
  });

  it('ignores damage during the invulnerability window', () => {
    const first = applyDamage(createHealth(100), 10, INVULNERABILITY).state;
    const midWindow = stepHealth(first, INVULNERABILITY / 2);
    const second = applyDamage(midWindow, 10, INVULNERABILITY);

    expect(second.damaged).toBe(false);
    expect(second.state.current).toBe(90);
    // An ignored hit does not extend the window.
    expect(second.state.invulnerableSeconds).toBeCloseTo(INVULNERABILITY / 2);
  });

  it('takes damage again once the window has passed', () => {
    const first = applyDamage(createHealth(100), 10, INVULNERABILITY).state;
    const later = stepHealth(first, INVULNERABILITY);
    expect(isInvulnerable(later)).toBe(false);

    const second = applyDamage(later, 10, INVULNERABILITY);
    expect(second.damaged).toBe(true);
    expect(second.state.current).toBe(80);
  });

  it('takes one hit per window under constant contact', () => {
    let health = createHealth(100);
    let hits = 0;
    // 2 s of contact every frame with a 0.8 s window: hits at 0 s, 0.8 s and 1.6 s.
    for (let frame = 0; frame < 120; frame++) {
      const result = applyDamage(health, 10, INVULNERABILITY);
      if (result.damaged) {
        hits++;
      }
      health = stepHealth(result.state, 1 / 60);
    }
    expect(hits).toBe(3);
    expect(health.current).toBe(70);
  });

  it('clamps at 0 and reports death', () => {
    const hit = applyDamage(createHealth(15), 40, INVULNERABILITY);
    expect(hit.state.current).toBe(0);
    expect(isDead(hit.state)).toBe(true);
  });

  it('dies exactly at 0', () => {
    expect(isDead(applyDamage(createHealth(10), 10).state)).toBe(true);
    expect(isDead(applyDamage(createHealth(10), 9).state)).toBe(false);
  });

  it('ignores damage once dead', () => {
    const dead = applyDamage(createHealth(10), 10).state;
    const again = applyDamage(dead, 10);
    expect(again.damaged).toBe(false);
    expect(again.state.current).toBe(0);
  });

  it('has no invulnerability unless a hit asks for it', () => {
    const hit = applyDamage(createHealth(30), 10);
    expect(isInvulnerable(hit.state)).toBe(false);
    expect(applyDamage(hit.state, 10).state.current).toBe(10);
  });

  it('never counts the invulnerability below 0', () => {
    const hit = applyDamage(createHealth(100), 10, INVULNERABILITY).state;
    expect(stepHealth(hit, 5).invulnerableSeconds).toBe(0);
  });
});
