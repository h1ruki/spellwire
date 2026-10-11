import { describe, expect, it } from 'vitest';
import { createLoadout, installPart, isInstalled, shotProfile, SLOTS } from '../src/core/loadout';
import { fire, frost } from './shipped';

describe('createLoadout', () => {
  it('starts with a trigger, a modifier and a payload slot, all empty', () => {
    expect(SLOTS).toEqual(['trigger', 'modifier', 'payload']);
    expect(createLoadout()).toEqual({ trigger: null, modifier: null, payload: null });
  });
});

describe('installPart', () => {
  it('puts a part into its empty slot and replaces nothing', () => {
    const result = installPart(createLoadout(), fire);
    expect(result.loadout.payload).toBe(fire);
    expect(result.replaced).toBeNull();
    expect(result.loadout.trigger).toBeNull();
    expect(result.loadout.modifier).toBeNull();
  });

  it('replaces the part in an occupied slot and returns the old one', () => {
    const withFire = installPart(createLoadout(), fire).loadout;
    const result = installPart(withFire, frost);
    expect(result.replaced).toBe(fire);
    expect(result.loadout.payload).toBe(frost);
  });

  it('leaves no trace of the replaced part in the loadout', () => {
    const withFire = installPart(createLoadout(), fire).loadout;
    const { loadout } = installPart(withFire, frost);
    expect(isInstalled(loadout, 'fire')).toBe(false);
    expect(isInstalled(loadout, 'frost')).toBe(true);
    expect(Object.values(loadout)).not.toContain(fire);
  });

  it('does not change the loadout it was given', () => {
    const empty = createLoadout();
    installPart(empty, fire);
    expect(empty.payload).toBeNull();
  });
});

describe('shotProfile', () => {
  it('is a plain shot with nothing installed', () => {
    expect(shotProfile(createLoadout())).toEqual({
      damageMultiplier: 1,
      burn: null,
      slow: null,
      colour: null,
    });
  });

  it('with Fire: +15% direct damage and a 3-second burn, and no slow', () => {
    const profile = shotProfile(installPart(createLoadout(), fire).loadout);
    expect(profile.damageMultiplier).toBe(1.15);
    expect(profile.burn?.durationSeconds).toBe(3);
    expect(profile.burn?.totalDamage).toBeGreaterThan(0);
    expect(profile.slow).toBeNull();
    expect(profile.colour).toBe(fire.colour);
  });

  it('with Frost: lower direct damage and a 40% slow for 2 seconds, and no burn', () => {
    const profile = shotProfile(installPart(createLoadout(), frost).loadout);
    expect(profile.damageMultiplier).toBeLessThan(1);
    expect(profile.slow).toEqual({ percent: 40, durationSeconds: 2 });
    expect(profile.burn).toBeNull();
    expect(profile.colour).toBe(frost.colour);
  });

  it('always produces a shot that deals damage, whatever is installed', () => {
    const loadouts = [
      createLoadout(),
      installPart(createLoadout(), fire).loadout,
      installPart(createLoadout(), frost).loadout,
      installPart(installPart(createLoadout(), fire).loadout, frost).loadout,
    ];
    for (const loadout of loadouts) {
      expect(shotProfile(loadout).damageMultiplier).toBeGreaterThan(0);
    }
  });
});
