import { describe, expect, it } from 'vitest';
import { applyDamage, createHealth, heal, withMaxHealth } from '../src/core/health';
import type { Card } from '../src/core/offers';
import {
  applyCard,
  buildStats,
  createBuild,
  shotDamage,
  takeCard,
  type Build,
} from '../src/core/upgrade';
import { base, boost, fire, frost, shipped } from './shipped';

const part = (p: typeof fire): Card => ({ kind: 'part', part: p });
const boostCard = (id: string): Card => ({ kind: 'boost', boost: boost(id) });
const take = (build: Build, ...cards: Card[]): Build =>
  cards.reduce((current, card) => applyCard(current, card).build, build);

describe('createBuild', () => {
  it('starts with an empty loadout and no boosts', () => {
    const build = createBuild();
    expect(build.loadout).toEqual({ trigger: null, modifier: null, payload: null });
    expect(build.boosts).toEqual([]);
    expect(buildStats(build, base)).toEqual(base);
  });
});

describe('applyCard', () => {
  it('installs a part and reports what it replaced', () => {
    const first = applyCard(createBuild(), part(fire));
    expect(first.replaced).toBeNull();
    expect(first.build.loadout.payload).toBe(fire);

    const second = applyCard(first.build, part(frost));
    expect(second.replaced).toBe(fire);
    expect(second.build.loadout.payload).toBe(frost);
  });

  it('adds a boost without using a slot', () => {
    const result = applyCard(createBuild(), boostCard('damage'));
    expect(result.replaced).toBeNull();
    expect(result.build.boosts).toEqual([boost('damage')]);
    expect(result.build.loadout).toEqual(createBuild().loadout);
  });

  it('keeps boosts when a part is replaced, and parts when a boost is taken', () => {
    const build = take(createBuild(), boostCard('damage'), part(fire), part(frost));
    expect(build.boosts).toEqual([boost('damage')]);
    expect(take(build, boostCard('move-speed')).loadout.payload).toBe(frost);
  });
});

describe('shotDamage', () => {
  it('is the base damage for the plain shot', () => {
    expect(shotDamage(createBuild(), base)).toBe(base.damage);
  });

  it('is 25% higher with Fire and 10% higher with Frost', () => {
    expect(shotDamage(take(createBuild(), part(fire)), base)).toBeCloseTo(base.damage * 1.25);
    expect(shotDamage(take(createBuild(), part(frost)), base)).toBeCloseTo(base.damage * 1.1);
  });

  it('is never lower with a payload than the plain shot, with or without boosts', () => {
    for (const boosts of [[], [boostCard('damage')], [boostCard('damage'), boostCard('damage')]]) {
      const plain = shotDamage(take(createBuild(), ...boosts), base);
      for (const payload of [fire, frost]) {
        expect(shotDamage(take(createBuild(), ...boosts, part(payload)), base)).toBeGreaterThan(
          plain,
        );
      }
    }
  });

  it('multiplies the damage boost with the payload multiplier', () => {
    const build = take(createBuild(), part(fire), boostCard('damage'), boostCard('damage'));
    expect(shotDamage(build, base)).toBeCloseTo(base.damage * 1.2 * 1.25);
    const withFrost = take(createBuild(), boostCard('damage'), part(frost));
    expect(shotDamage(withFrost, base)).toBeCloseTo(base.damage * 1.1 * 1.1);
  });

  it('keeps boosts stacking additively under a payload: two +10% are +20%, not +21%', () => {
    const build = take(createBuild(), boostCard('damage'), part(fire), boostCard('damage'));
    expect(shotDamage(build, base)).toBeCloseTo(15);
    expect(shotDamage(build, base)).not.toBeCloseTo(base.damage * 1.21 * 1.25);
  });

  it('leaves the burn alone when damage is boosted', () => {
    const build = take(createBuild(), part(fire), boostCard('damage'));
    expect(build.loadout.payload?.burn).toEqual(fire.burn);
  });
});

describe('takeCard', () => {
  it('raises current health with maximum health', () => {
    const hurt = applyDamage(createHealth(base.maxHealth), 60).state;
    const taken = takeCard(createBuild(), hurt, boostCard('max-health'), base);
    expect(taken.health.max).toBe(base.maxHealth + 20);
    expect(taken.health.current).toBe(hurt.current + 20);
  });

  it('keeps a full health bar full', () => {
    const taken = takeCard(
      createBuild(),
      createHealth(base.maxHealth),
      boostCard('max-health'),
      base,
    );
    expect(taken.health.current).toBe(taken.health.max);
  });

  it('leaves health alone for other cards', () => {
    const hurt = applyDamage(createHealth(base.maxHealth), 60).state;
    expect(takeCard(createBuild(), hurt, boostCard('damage'), base).health).toEqual(hurt);
    expect(takeCard(createBuild(), hurt, part(fire), base).health).toEqual(hurt);
  });

  it('keeps post-hit invulnerability running', () => {
    const hurt = applyDamage(createHealth(base.maxHealth), 10, 0.8).state;
    const taken = takeCard(createBuild(), hurt, boostCard('max-health'), base);
    expect(taken.health.invulnerableSeconds).toBe(0.8);
  });
});

describe('withMaxHealth', () => {
  it('never leaves current health above the new maximum', () => {
    const state = withMaxHealth(createHealth(100), 80);
    expect(state).toMatchObject({ current: 80, max: 80 });
  });
});

describe('skipping an offer', () => {
  const { skipHeal } = shipped.tuning;

  it('heals by the configured amount', () => {
    const hurt = applyDamage(createHealth(100), 50).state;
    expect(heal(hurt, skipHeal).current).toBe(50 + skipHeal);
  });

  it('never heals above maximum health', () => {
    const scratched = applyDamage(createHealth(100), skipHeal / 2).state;
    expect(heal(scratched, skipHeal).current).toBe(100);
    expect(heal(createHealth(100), skipHeal).current).toBe(100);
  });

  it('respects a maximum raised by boosts', () => {
    const raised = takeCard(createBuild(), createHealth(100), boostCard('max-health'), base).health;
    const hurt = applyDamage(raised, 5).state;
    expect(heal(hurt, skipHeal).current).toBe(120);
  });

  it('does not change the build', () => {
    const build = take(createBuild(), part(fire));
    heal(createHealth(100), skipHeal);
    expect(build.loadout.payload).toBe(fire);
  });

  it('ignores a negative amount and does not revive the dead', () => {
    const hurt = applyDamage(createHealth(100), 50).state;
    expect(heal(hurt, -10).current).toBe(50);
    const dead = applyDamage(createHealth(100), 100).state;
    expect(heal(dead, skipHeal).current).toBe(0);
  });
});
