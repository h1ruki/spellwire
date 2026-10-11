export const SLOTS = ['trigger', 'modifier', 'payload'] as const;
export type Slot = (typeof SLOTS)[number];

/** Damage over time left on an enemy by a hit. */
export interface BurnSpec {
  durationSeconds: number;
  /** Damage dealt over the whole duration if the burn is left to run out. */
  totalDamage: number;
}

/** A temporary cut to an enemy's speed left by a hit. */
export interface SlowSpec {
  /** How much speed is taken away, from above 0 to 100. */
  percent: number;
  durationSeconds: number;
}

/** A weapon part from the parts file. */
export interface Part {
  id: string;
  slot: Slot;
  name: string;
  description: string;
  /** Hex colour in the form "#rrggbb". */
  colour: string;
  /** Multiplies the direct damage of a shot; 1 leaves it unchanged. */
  damageMultiplier: number;
  burn: BurnSpec | null;
  slow: SlowSpec | null;
}

/** What is installed in each slot; null means the slot is empty. */
export type Loadout = Readonly<Record<Slot, Part | null>>;

export interface InstallResult {
  loadout: Loadout;
  /** The part that was in the slot before; it is lost for the run. */
  replaced: Part | null;
}

/** Every run starts with all three slots empty. */
export function createLoadout(): Loadout {
  return { trigger: null, modifier: null, payload: null };
}

/** Puts a part into its slot, replacing whatever was there. */
export function installPart(loadout: Loadout, part: Part): InstallResult {
  return { loadout: { ...loadout, [part.slot]: part }, replaced: loadout[part.slot] };
}

export function isInstalled(loadout: Loadout, partId: string): boolean {
  return SLOTS.some((slot) => loadout[slot]?.id === partId);
}

/** How the basic shot behaves with the current loadout. */
export interface ShotProfile {
  /** Multiplies the direct damage of the shot. */
  damageMultiplier: number;
  burn: BurnSpec | null;
  slow: SlowSpec | null;
  /** Colour of the installed payload, or null for the plain shot. */
  colour: string | null;
}

/**
 * The basic shot is always produced. The payload only changes it: with none
 * installed the shot is plain. The trigger and modifier slots do nothing yet.
 */
export function shotProfile(loadout: Loadout): ShotProfile {
  const payload = loadout.payload;
  if (!payload) {
    return { damageMultiplier: 1, burn: null, slow: null, colour: null };
  }
  return {
    damageMultiplier: payload.damageMultiplier,
    burn: payload.burn,
    slow: payload.slow,
    colour: payload.colour,
  };
}
