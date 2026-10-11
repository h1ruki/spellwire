# Spellwire

A top-down survivor roguelite where you build your weapon from a trigger, a modifier and an elemental payload, then watch how each part changes the way it fires.

**Status:** early development. Milestone M1 (move and shoot) is complete. Milestone M2 (horde and XP) is in review: the horde grows on a timeline, brutes join the swarmers at about 2:00, and kills drop XP crystals that fill a bar and raise your level. Level-ups do not give upgrades yet; upgrades and weapon parts arrive in M3. The shapes on screen are placeholders for the planned pixel art.

**Play:** <https://h1ruki.github.io/spellwire/> (live since 11 October 2026; it shows the latest milestone merged to `main`, so M2 appears there once it is merged)

## Controls

| Input | Action |
| --- | --- |
| **W A S D** | Move in 8 directions |
| **Space** | Dash: a short burst in the direction you are moving, or towards the cursor if you are standing still. 1.5 s cooldown; it does not make you invulnerable |
| **Mouse** | Aim. The weapon fires on its own towards the cursor; there is no fire button |
| **R** | Restart after you die |

Enemies hurt on contact; brutes are slow and tough and hit much harder than swarmers. After a hit the screen shakes, you blink and you cannot be hurt again for a moment.

Every kill drops an XP crystal. Walk near a crystal and it flies to you. A full XP bar raises your level. The clock in the top-right corner shows how long the run has lasted; the horde gets heavier as it runs.

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
  - `moveSpeed`
  - `dash`: `distance`, `durationSeconds`, `cooldownSeconds`
  - `fire`: `shotsPerSecond`, `projectileSpeed`, `projectileDamage`
  - `player`: `maxHealth`, `postHitInvulnerabilitySeconds`
  - `spawn`: `minDistanceFromPlayer`
  - `caps`: `maxProjectiles`, `maxEnemies`
  - `xp`: `firstLevelXp` (XP for the first level-up), `perLevelIncrease` (extra XP each later level needs)
  - `pickupRange`
  - `crystals`: `attractSpeed`, `maxCrystals`
  - `hitFeedback`: `flashSeconds`, `knockbackStrength`, `shakeIntensity` (pixels; 0 turns the shake off), `shakeSeconds`
- `src/data/enemies.json`: for each enemy (`swarmer`, `brute`), `speed`, `health`, `contactDamage`, `size`, `colour`, `shape` (the player shapes plus `"hexagon"`), `xp` and `knockbackResistance` (0 = pushed fully by a hit, 1 = not pushed).
- `src/data/spawns.json`: the spawn timeline. Each entry has `atSeconds` and a `spawns` list of `enemy`, `intervalSeconds` and `groupSize`. An entry is a complete snapshot of everything that spawns from that time until the next entry, not a change to the one before: an entry that adds brutes must list swarmers too. Entries must be in time order, and the last one continues for the rest of the run.

## How it is built

TypeScript, [Phaser 3](https://phaser.io/) and Vite, deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`.

- `src/core/`: gameplay rules as plain TypeScript with no Phaser imports, covered by unit tests in `tests/`.
- `src/data/`: content and tuning values.
- `src/game/`: Phaser scenes, input, collisions and drawing.
- `src/ui/`: the on-screen display (health, dash, XP bar, level, run time, death prompt).

## Licence

Source code is released under the [MIT Licence](LICENSE). Third-party assets keep their own licences, which will be listed in `docs/CREDITS.md`.
