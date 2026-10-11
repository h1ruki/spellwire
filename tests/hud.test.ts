import { describe, expect, it } from 'vitest';
import { formatRunTime } from '../src/ui/Hud';

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
