export interface XpTuning {
  /** XP needed to go from level 1 to level 2. */
  firstLevelXp: number;
  /** How much more XP each later level needs than the one before it. */
  perLevelIncrease: number;
}

export interface XpState {
  /** Starts at 1. */
  level: number;
  /** XP collected towards the next level. */
  xp: number;
}

export interface XpGain {
  state: XpState;
  /** How many levels this gain completed; usually 0 or 1. */
  levelsGained: number;
}

export function createXpState(): XpState {
  return { level: 1, xp: 0 };
}

/** XP needed to fill the bar at the given level. */
export function xpForNextLevel(level: number, tuning: XpTuning): number {
  return tuning.firstLevelXp + (level - 1) * tuning.perLevelIncrease;
}

/**
 * Adds XP. A full bar raises the level and the leftover carries over, so one
 * large gain can raise several levels.
 */
export function addXp(state: XpState, amount: number, tuning: XpTuning): XpGain {
  let level = state.level;
  let xp = state.xp + Math.max(0, amount);
  let levelsGained = 0;

  while (xp >= xpForNextLevel(level, tuning)) {
    xp -= xpForNextLevel(level, tuning);
    level++;
    levelsGained++;
  }

  return { state: { level, xp }, levelsGained };
}
