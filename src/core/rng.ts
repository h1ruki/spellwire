/** Returns a number in [0, 1), like Math.random. */
export type Rng = () => number;

/**
 * A small seeded generator (mulberry32). The same seed always gives the same
 * sequence, so anything drawn from it can be reproduced in a test.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A whole number from 0 up to, but not including, `count`. */
export function randomIndex(rng: Rng, count: number): number {
  return Math.min(count - 1, Math.floor(rng() * count));
}

/**
 * Up to `count` different items drawn at random, in the order drawn. Asking for
 * more than there are returns them all.
 */
export function pickDistinct<T>(items: readonly T[], count: number, rng: Rng): T[] {
  const remaining = [...items];
  const picked: T[] = [];
  while (picked.length < count && remaining.length > 0) {
    picked.push(...remaining.splice(randomIndex(rng, remaining.length), 1));
  }
  return picked;
}
