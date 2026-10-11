import { describe, expect, it } from 'vitest';
import { formatRunTime, healthBarWidth } from '../src/ui/Hud';

describe('formatRunTime', () => {
  it.each([
    [0, '0:00'],
    [5.9, '0:05'],
    [30, '0:30'],
    [59.99, '0:59'],
    [60, '1:00'],
    [125, '2:05'],
    [270, '4:30'],
    [600, '10:00'],
  ])('shows %d s as %s', (seconds, expected) => {
    expect(formatRunTime(seconds)).toBe(expected);
  });
});

describe('healthBarWidth', () => {
  it('grows with maximum health', () => {
    const start = healthBarWidth(100, 100);
    expect(healthBarWidth(120, 100)).toBeCloseTo(start * 1.2);
    expect(healthBarWidth(140, 100)).toBeGreaterThan(healthBarWidth(120, 100));
  });

  it('stops growing at a limit so it stays clear of the XP bar', () => {
    expect(healthBarWidth(1000, 100)).toBe(healthBarWidth(2000, 100));
    expect(healthBarWidth(1000, 100)).toBeLessThan(400);
  });
});
