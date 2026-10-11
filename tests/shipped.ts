import { loadGameData } from '../src/core/data';
import { baseStats } from '../src/core/stats';

/** The data files shipped with the game, for tests that check the real content. */
export const shipped = loadGameData();
export const base = baseStats(shipped.tuning);

function byId<T extends { id: string }>(items: readonly T[], id: string): T {
  const found = items.find((item) => item.id === id);
  if (!found) {
    throw new Error(`"${id}" is missing from the shipped data`);
  }
  return found;
}

export const fire = byId(shipped.parts, 'fire');
export const frost = byId(shipped.parts, 'frost');
export const boost = (id: string) => byId(shipped.boosts, id);
