# Spellwire

A top-down survivor roguelite where you build your weapon from a trigger, a modifier and an elemental payload, then watch how each part changes the way it fires.

**Status:** early development. Milestone M0 (setup) is in review: a dark arena with a player shape that moves with WASD. There is no combat yet.

**Play:** <https://h1ruki.github.io/spellwire/> (not yet live; goes live once the M0 deployment succeeds and the product owners verify it)

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

Open the address the dev server prints (it ends in `/spellwire/`) and move with **W A S D**. Edits to the code or data reload the page automatically.

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
- `src/data/tuning.json`: `moveSpeed` (pixels per second).

## How it is built

TypeScript, [Phaser 3](https://phaser.io/) and Vite, deployed to GitHub Pages by a GitHub Actions workflow on every push to `main`.

- `src/core/`: gameplay rules as plain TypeScript with no Phaser imports, covered by unit tests in `tests/`.
- `src/data/`: content and tuning values.
- `src/game/`: Phaser scenes, input and drawing.

## Licence

Source code is released under the [MIT Licence](LICENSE). Third-party assets keep their own licences, which will be listed in `docs/CREDITS.md`.
