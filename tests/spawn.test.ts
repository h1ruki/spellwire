import { describe, expect, it } from 'vitest';
import { roomUnderCap, spawnGroup, type SpawnRequest } from '../src/core/spawn';

const WIDTH = 1280;
const HEIGHT = 720;
const INSET = 26;
const MIN_DISTANCE = 350;

/** Small repeatable generator so a failing case can be reproduced. Test-only. */
function sequence(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const request = (overrides: Partial<SpawnRequest> = {}): SpawnRequest => ({
  count: 3,
  arenaWidth: WIDTH,
  arenaHeight: HEIGHT,
  inset: INSET,
  spacing: 42,
  player: { x: WIDTH / 2, y: HEIGHT / 2 },
  minDistanceFromPlayer: MIN_DISTANCE,
  random: sequence(1),
  ...overrides,
});

const PLAYER_SPOTS = [
  ['the centre', { x: 640, y: 360 }],
  ['the left wall', { x: 20, y: 360 }],
  ['the right wall', { x: 1260, y: 360 }],
  ['the top wall', { x: 640, y: 20 }],
  ['the bottom wall', { x: 640, y: 700 }],
  ['the top-left corner', { x: 20, y: 20 }],
  ['the bottom-right corner', { x: 1260, y: 700 }],
] as const;

describe('spawnGroup', () => {
  it.each(PLAYER_SPOTS)(
    'keeps every enemy at least the minimum distance from a player at %s',
    (_name, player) => {
      for (let seed = 1; seed <= 300; seed++) {
        const group = spawnGroup(request({ player, random: sequence(seed) }));

        expect(group).toHaveLength(3);
        for (const position of group) {
          const distance = Math.hypot(position.x - player.x, position.y - player.y);
          expect(distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
        }
      }
    },
  );

  it('places every enemy just inside an arena edge', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (const position of spawnGroup(request({ random: sequence(seed) }))) {
        expect(position.x).toBeGreaterThanOrEqual(INSET);
        expect(position.x).toBeLessThanOrEqual(WIDTH - INSET);
        expect(position.y).toBeGreaterThanOrEqual(INSET);
        expect(position.y).toBeLessThanOrEqual(HEIGHT - INSET);

        const onEdge =
          position.x === INSET ||
          position.x === WIDTH - INSET ||
          position.y === INSET ||
          position.y === HEIGHT - INSET;
        expect(onEdge).toBe(true);
      }
    }
  });

  it('uses all four edges', () => {
    const edges = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const [first] = spawnGroup(request({ count: 1, random: sequence(seed) }));
      if (!first) continue;
      if (first.y === INSET) edges.add('top');
      if (first.y === HEIGHT - INSET) edges.add('bottom');
      if (first.x === INSET) edges.add('left');
      if (first.x === WIDTH - INSET) edges.add('right');
    }
    expect([...edges].sort()).toEqual(['bottom', 'left', 'right', 'top']);
  });

  it('returns the requested number of enemies as one group', () => {
    const group = spawnGroup(request({ count: 5 }));
    expect(group).toHaveLength(5);

    // A group shares one edge, so it lines up along x or along y.
    const sameX = group.every((p) => p.x === group[0]?.x);
    const sameY = group.every((p) => p.y === group[0]?.y);
    expect(sameX || sameY).toBe(true);
  });

  it('spawns nothing when nowhere is far enough from the player', () => {
    expect(spawnGroup(request({ minDistanceFromPlayer: 5000 }))).toEqual([]);
  });

  it('spawns nothing when asked for no enemies', () => {
    expect(spawnGroup(request({ count: 0 }))).toEqual([]);
  });

  it('works with the default random source', () => {
    const group = spawnGroup(request({ random: undefined }));
    expect(group).toHaveLength(3);
  });
});

describe('roomUnderCap', () => {
  it('allows everything when there is room', () => {
    expect(roomUnderCap(3, 10, 60)).toBe(3);
  });

  it('allows only what fits under the cap', () => {
    expect(roomUnderCap(3, 58, 60)).toBe(2);
  });

  it('allows nothing at or above the cap', () => {
    expect(roomUnderCap(3, 60, 60)).toBe(0);
    expect(roomUnderCap(3, 75, 60)).toBe(0);
  });
});
