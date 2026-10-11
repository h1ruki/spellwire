import { describe, expect, it } from 'vitest';
import { addXp, createXpState, xpForNextLevel } from '../src/core/xp';

const TUNING = { firstLevelXp: 20, perLevelIncrease: 10 };

describe('xpForNextLevel', () => {
  it('needs the base amount for the first level-up', () => {
    expect(xpForNextLevel(1, TUNING)).toBe(20);
  });

  it('grows by a fixed amount per level', () => {
    expect(xpForNextLevel(2, TUNING)).toBe(30);
    expect(xpForNextLevel(3, TUNING)).toBe(40);
    expect(xpForNextLevel(10, TUNING)).toBe(110);
  });

  it('stays flat when there is no growth', () => {
    const flat = { firstLevelXp: 15, perLevelIncrease: 0 };
    expect(xpForNextLevel(1, flat)).toBe(15);
    expect(xpForNextLevel(7, flat)).toBe(15);
  });
});

describe('addXp', () => {
  it('starts at level 1 with an empty bar', () => {
    expect(createXpState()).toEqual({ level: 1, xp: 0 });
  });

  it('fills the bar without levelling up', () => {
    const gain = addXp(createXpState(), 5, TUNING);
    expect(gain).toEqual({ state: { level: 1, xp: 5 }, levelsGained: 0 });
  });

  it('adds up crystal by crystal', () => {
    let state = createXpState();
    for (let i = 0; i < 19; i++) {
      state = addXp(state, 1, TUNING).state;
    }
    expect(state).toEqual({ level: 1, xp: 19 });
  });

  it('levels up when the bar is exactly full and resets it', () => {
    const gain = addXp({ level: 1, xp: 19 }, 1, TUNING);
    expect(gain).toEqual({ state: { level: 2, xp: 0 }, levelsGained: 1 });
  });

  it('carries leftover XP over into the next level', () => {
    const gain = addXp({ level: 1, xp: 18 }, 5, TUNING);
    expect(gain).toEqual({ state: { level: 2, xp: 3 }, levelsGained: 1 });
  });

  it('needs more XP for the next level', () => {
    const levelTwo = addXp(createXpState(), 20, TUNING).state;
    expect(addXp(levelTwo, 29, TUNING)).toEqual({ state: { level: 2, xp: 29 }, levelsGained: 0 });
    expect(addXp(levelTwo, 30, TUNING)).toEqual({ state: { level: 3, xp: 0 }, levelsGained: 1 });
  });

  it('gains several levels from one large amount', () => {
    // 20 + 30 + 40 = 90 for three levels, with 7 left over.
    const gain = addXp(createXpState(), 97, TUNING);
    expect(gain).toEqual({ state: { level: 4, xp: 7 }, levelsGained: 3 });
  });

  it('never loses XP across level-ups', () => {
    let state = createXpState();
    let spent = 0;
    for (const amount of [3, 50, 1, 120, 7]) {
      const gain = addXp(state, amount, TUNING);
      for (let level = state.level; level < gain.state.level; level++) {
        spent += xpForNextLevel(level, TUNING);
      }
      state = gain.state;
    }
    expect(spent + state.xp).toBe(3 + 50 + 1 + 120 + 7);
  });

  it('ignores a negative amount', () => {
    expect(addXp({ level: 2, xp: 4 }, -10, TUNING).state).toEqual({ level: 2, xp: 4 });
  });
});
