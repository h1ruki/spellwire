import { describe, expect, it } from 'vitest';
import { cameraScroll, isOutside, VIEW, viewRect } from '../src/core/camera';
import type { Vec2 } from '../src/core/movement';
import { createRng } from '../src/core/rng';
import { roomUnderCap, spawnGroup, type SpawnRequest } from '../src/core/spawn';
import { shipped } from './shipped';

const WORLD = shipped.tuning.world;
const MARGIN = 30;
const MIN_DISTANCE = 350;
const SEEDS = Array.from({ length: 300 }, (_, index) => index + 1);

/** A seeded generator, so a failing case can be reproduced. */
const sequence = createRng;

/** A request with the view where the camera would put it for this player. */
const request = (player: Vec2, overrides: Partial<SpawnRequest> = {}): SpawnRequest => ({
  count: 3,
  world: WORLD,
  view: viewRect(cameraScroll(player, VIEW, WORLD), VIEW),
  margin: MARGIN,
  spacing: 48,
  player,
  minDistanceFromPlayer: MIN_DISTANCE,
  random: sequence(1),
  ...overrides,
});

const CENTRE = { x: WORLD.width / 2, y: WORLD.height / 2 };
const PLAYER_SPOTS: [string, Vec2][] = [
  ['the middle of the world', CENTRE],
  ['open ground off centre', { x: 900, y: 1500 }],
  ['the left boundary', { x: 20, y: 1080 }],
  ['the right boundary', { x: WORLD.width - 20, y: 1080 }],
  ['the top boundary', { x: 1920, y: 20 }],
  ['the bottom boundary', { x: 1920, y: WORLD.height - 20 }],
  ['the top-left corner', { x: 20, y: 20 }],
  ['the top-right corner', { x: WORLD.width - 20, y: 20 }],
  ['the bottom-left corner', { x: 20, y: WORLD.height - 20 }],
  ['the bottom-right corner', { x: WORLD.width - 20, y: WORLD.height - 20 }],
];

/** Which side of the view a spawned enemy is beyond. */
function sideOf(position: Vec2, view: SpawnRequest['view']): string {
  if (position.y < view.y) return 'top';
  if (position.y > view.y + view.height) return 'bottom';
  if (position.x < view.x) return 'left';
  if (position.x > view.x + view.width) return 'right';
  return 'inside';
}

describe('spawnGroup', () => {
  describe.each(PLAYER_SPOTS)('with the player at %s', (_name, player) => {
    it('always finds room for the whole group', () => {
      for (const seed of SEEDS) {
        expect(spawnGroup(request(player, { random: sequence(seed) }))).toHaveLength(3);
      }
    });

    it('spawns out of sight, beyond the edge of the view', () => {
      for (const seed of SEEDS) {
        const spawn = request(player, { random: sequence(seed) });
        for (const position of spawnGroup(spawn)) {
          expect(isOutside(position, spawn.view)).toBe(true);
        }
      }
    });

    it('spawns inside the world, with room for the whole enemy', () => {
      for (const seed of SEEDS) {
        for (const position of spawnGroup(request(player, { random: sequence(seed) }))) {
          expect(position.x).toBeGreaterThanOrEqual(MARGIN);
          expect(position.x).toBeLessThanOrEqual(WORLD.width - MARGIN);
          expect(position.y).toBeGreaterThanOrEqual(MARGIN);
          expect(position.y).toBeLessThanOrEqual(WORLD.height - MARGIN);
        }
      }
    });

    it('never spawns within the minimum distance of the player', () => {
      for (const seed of SEEDS) {
        for (const position of spawnGroup(request(player, { random: sequence(seed) }))) {
          const distance = Math.hypot(position.x - player.x, position.y - player.y);
          expect(distance).toBeGreaterThanOrEqual(MIN_DISTANCE);
        }
      }
    });
  });

  const sidesUsed = (player: Vec2): string[] => {
    const sides = new Set<string>();
    for (const seed of SEEDS) {
      const spawn = request(player, { count: 1, random: sequence(seed) });
      for (const position of spawnGroup(spawn)) {
        sides.add(sideOf(position, spawn.view));
      }
    }
    return [...sides].sort();
  };

  it('arrives from all four sides in open ground', () => {
    expect(sidesUsed(CENTRE)).toEqual(['bottom', 'left', 'right', 'top']);
  });

  it('arrives from the three open sides when the view is against a boundary', () => {
    expect(sidesUsed({ x: 20, y: 1080 })).toEqual(['bottom', 'right', 'top']);
    expect(sidesUsed({ x: 1920, y: WORLD.height - 20 })).toEqual(['left', 'right', 'top']);
  });

  it('arrives from the two open sides in a corner', () => {
    expect(sidesUsed({ x: 20, y: 20 })).toEqual(['bottom', 'right']);
    expect(sidesUsed({ x: WORLD.width - 20, y: WORLD.height - 20 })).toEqual(['left', 'top']);
  });

  it('appears just beyond the view, one margin out', () => {
    for (const seed of SEEDS) {
      const spawn = request(CENTRE, { count: 1, random: sequence(seed) });
      const [position] = spawnGroup(spawn);
      if (!position) throw new Error('expected a spawn');
      const { view } = spawn;
      const gaps = [
        view.y - position.y,
        position.y - (view.y + view.height),
        view.x - position.x,
        position.x - (view.x + view.width),
      ];
      expect(Math.max(...gaps)).toBe(MARGIN);
    }
  });

  it('follows the view: the same draw lands in a different place after the camera moves', () => {
    const [here] = spawnGroup(request(CENTRE, { count: 1, random: sequence(7) }));
    const [there] = spawnGroup(
      request({ x: CENTRE.x + 500, y: CENTRE.y - 300 }, { count: 1, random: sequence(7) }),
    );
    expect(there?.x).toBeCloseTo((here?.x ?? 0) + 500);
    expect(there?.y).toBeCloseTo((here?.y ?? 0) - 300);
  });

  it('is reproducible with the same random sequence', () => {
    expect(spawnGroup(request(CENTRE, { random: sequence(42) }))).toEqual(
      spawnGroup(request(CENTRE, { random: sequence(42) })),
    );
  });

  it('returns the requested number of enemies as one group along one side', () => {
    const group = spawnGroup(request(CENTRE, { count: 5 }));
    expect(group).toHaveLength(5);
    const sameX = group.every((p) => p.x === group[0]?.x);
    const sameY = group.every((p) => p.y === group[0]?.y);
    expect(sameX || sameY).toBe(true);
  });

  it('in a world no larger than the view, spawns just inside the view edges, away from the player', () => {
    const player = { x: 640, y: 360 };
    const view = { x: 0, y: 0, ...VIEW };
    for (const seed of SEEDS) {
      const group = spawnGroup(request(player, { world: VIEW, view, random: sequence(seed) }));
      expect(group).toHaveLength(3);
      for (const position of group) {
        const onEdge =
          position.x === MARGIN ||
          position.x === VIEW.width - MARGIN ||
          position.y === MARGIN ||
          position.y === VIEW.height - MARGIN;
        expect(onEdge).toBe(true);
        expect(Math.hypot(position.x - player.x, position.y - player.y)).toBeGreaterThanOrEqual(
          MIN_DISTANCE,
        );
      }
    }
  });

  it('spawns nothing when nowhere is far enough from the player', () => {
    expect(spawnGroup(request(CENTRE, { minDistanceFromPlayer: 50000 }))).toEqual([]);
  });

  it('spawns nothing when asked for no enemies', () => {
    expect(spawnGroup(request(CENTRE, { count: 0 }))).toEqual([]);
  });

  it('works with the default random source', () => {
    expect(spawnGroup(request(CENTRE, { random: undefined }))).toHaveLength(3);
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
