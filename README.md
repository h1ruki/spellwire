# Spellwire

A top-down survivor roguelite where you build your weapon from a trigger, a modifier and an elemental payload, then watch how each part changes the way it fires.

**Status:** early development. Milestones M1 (move and shoot) and M2 (horde and XP) are complete. Milestone M3 (loadouts) is in review: every level-up pauses the game and offers three upgrade cards, the Fire and Frost payloads change how the basic shot behaves, and the run takes place in a world larger than the screen. Triggers and modifiers arrive in M4. The shapes and effects on screen are placeholders for the planned pixel art.

**Play:** <https://h1ruki.github.io/spellwire/> (live since 11 October 2026; it shows the latest milestone merged to `main`, so M3 appears there once it is merged)

## Controls

| Input | Action |
| --- | --- |
| **W A S D** | Move in 8 directions |
| **Space** | Dash: a short burst in the direction you are moving, or towards the cursor if you are standing still. 1.5 s cooldown; it does not make you invulnerable |
| **Mouse** | Aim. The weapon fires on its own towards the cursor; there is no fire button |
| **1 2 3** or a click | Choose an upgrade card during a level-up |
| **X** or the Skip button | Skip the upgrade and restore a little health |
| **R** | Restart after you die |

The world is three screens wide and three high. The camera keeps you in the middle of the screen until it reaches the edge of the world, where it stops and you walk on towards the edge by yourself. A lighter strip and a border mark the edge; nothing lies beyond it. Enemies arrive from just off screen.

Enemies hurt on contact; brutes are slower and tough, hit much harder than swarmers and are barely pushed back by shots. After a hit the screen shakes, you blink and you cannot be hurt again for a moment.

Every kill drops an XP crystal. Walk near a crystal and it flies to you. A full XP bar raises your level. The clock in the top-right corner shows how long the run has lasted; the horde gets heavier as it runs.

### Level-ups and your loadout

Your weapon has one loadout with three slots: trigger, modifier and payload. They start empty, and the bottom-left corner shows what is in each. The plain shot always fires; parts only change it.

Each level-up pauses everything (enemies, shots, the clock and every cooldown) and offers three cards. Each card compares your current build with the build it would give: ▲ in green is better, ▼ in red is worse, and = marks something that stays the same. Direct damage is shown as a percentage of the plain shot. A key or mouse button that was already held when the offer appeared does nothing until you press it again. Gain two levels at once and you get two offers, one after the other.

- **Fire** (payload): shots deal 125% damage and set enemies burning for 3 seconds. A burning enemy keeps taking damage between hits, and can die from the burn alone.
- **Frost** (payload): shots deal 110% damage and slow enemies by 40% for 2 seconds.
- **Stat boosts**: fire rate, damage, move speed, max health and pickup range. They do not use a slot, last for the run and add up each time you take one.
- **Skip**: take nothing and restore 10 health, never above your maximum.

There is one payload slot. Installing Frost over Fire, or Fire over Frost, replaces the old part, which is lost for the run; the card says so before you choose. Until you have a payload, every offer shows both Fire and Frost. Hitting an enemy again restarts its burn or slow instead of stacking it.

- [Product specification](docs/spec.md)
- [Development plan](docs/plan.md)
- [Decision log](docs/decisions.md)
- [Current status](docs/status.md)

## Run it locally

You need [Node.js](https://nodejs.org/) 24 (the current LTS; the version is recorded in `.nvmrc`) and npm.

```sh
npm ci
npm run dev
```

Open the address the dev server prints (it ends in `/spellwire/`). Edits to the code or data reload the page automatically.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves the production build, as GitHub Pages will |
| `npm run test` | Unit tests (Vitest) |
| `npm run typecheck` | TypeScript in strict mode |
| `npm run lint` | ESLint and a Prettier formatting check |
| `npm run format` | Rewrites files with Prettier |
| `npm run check` | Typecheck, lint, test and build; the same checks CI runs |

## Change how it looks and feels

Tuning lives in JSON under `src/data/` and is validated on startup; a mistake shows a message naming the file and field.

- `src/data/player.json`: `shape` (`"square"`, `"circle"` or `"triangle"`), `colour` (a hex colour such as `"#39e6ff"`) and `size` (pixels).
- `src/data/tuning.json`: distances are in pixels, speeds in pixels per second and times in seconds.
  - `world`: `width` and `height` of the world; at least the size of the view (1280 by 720)
  - `moveSpeed`
  - `dash`: `distance`, `durationSeconds`, `cooldownSeconds`
  - `fire`: `shotsPerSecond`, `projectileSpeed`, `projectileDamage`, `projectileSize` (as drawn) and `projectileHitRadius` (what it hits with; larger than half the size makes aiming more forgiving)
  - `player`: `maxHealth`, `postHitInvulnerabilitySeconds`
  - `spawn`: `minDistanceFromPlayer` (enemies appear just off screen, and never closer to you than this)
  - `caps`: `maxProjectiles`, `maxEnemies`
  - `xp`: `firstLevelXp` (XP for the first level-up), `perLevelIncrease` (extra XP each later level needs)
  - `pickupRange`
  - `crystals`: `attractSpeed`, `maxCrystals` and `tiers`, a list of `minValue`, `colour` and `size`. A crystal looks like the highest tier whose `minValue` is at most its XP value (the first tier must start at 1; tiers go in ascending order), so one that absorbs others at the cap changes look with its total
  - `hitFeedback`: `flashSeconds`, `knockbackStrength`, `shakeIntensity` (pixels; 0 turns the shake off), `shakeSeconds`
  - `skipHeal`: health restored by skipping an upgrade offer
  - `burn`: `tickIntervalSeconds`, how often a burning enemy takes its burn damage
- `src/data/enemies.json`: for each enemy (`swarmer`, `brute`), `speed`, `health`, `contactDamage`, `size`, `colour`, `shape` (the player shapes plus `"hexagon"`), `xp` and `knockbackResistance` (0 = pushed fully by a hit, 1 = not pushed).
- `src/data/parts.json`: the weapon parts, as a list. Each has an `id` (used by the code; keep it), `slot` (only `"payload"` exists so far), `name` and `description` (shown on the card), `colour` (shots, cards, the HUD and the effect on enemies) and `damageMultiplier` (1.25 is 125% of the plain shot's direct damage; it must be 1 or more, so no payload hits softer than the plain shot). A part may also have `burn` (`durationSeconds` and `totalDamage`, the damage a burn deals if left to run out) and `slow` (`percent` from above 0 to 100, and `durationSeconds`).
- `src/data/boosts.json`: the stat-boost cards, as a list. Each has an `id`, `stat` (`"fireRate"`, `"damage"`, `"moveSpeed"`, `"maxHealth"` or `"pickupRange"`), `name`, `description`, `amount` and `unit`: `"percent"` adds that share of the starting value, `"flat"` adds the amount itself. Descriptions avoid numbers because the card shows the real before and after values.
- `src/data/spawns.json`: the spawn timeline. Each entry has `atSeconds` and a `spawns` list of `enemy`, `intervalSeconds` and `groupSize`. An entry is a complete snapshot of everything that spawns from that time until the next entry, not a change to the one before: an entry that adds brutes must list swarmers too. Entries must be in time order, and the last one continues for the rest of the run.

## How it is built

TypeScript, [Phaser 3](https://phaser.io/) and Vite, deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`.

- `src/core/`: gameplay rules as plain TypeScript with no Phaser imports, covered by unit tests in `tests/`. This includes where the camera sits, where enemies may spawn and how an upgrade card compares two builds.
- `src/data/`: content and tuning values.
- `src/game/`: Phaser scenes (the arena and the upgrade offer shown over it), input, collisions and drawing.
- `src/ui/`: the on-screen display (health, dash, XP bar, level, run time, loadout slots, death prompt) and the upgrade cards.

Upgrade offers draw their random cards from a small seeded generator, so tests can reproduce an offer exactly. A seed does not make a whole run repeatable.

## Licence

Source code is released under the [MIT Licence](LICENSE). Third-party assets keep their own licences, which will be listed in `docs/CREDITS.md`.
