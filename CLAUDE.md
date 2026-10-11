# Spellwire
A browser-based top-down survivor roguelite in which players build weapons from triggers, modifiers and elemental payloads.

## Authoritative files
- docs/spec.md (locked product scope; it wins on any scope conflict)
- docs/plan.md (approved stack, architecture, milestones M0–M6 and acceptance criteria)
- docs/decisions.md (locked decisions and why)
- docs/status.md (current milestone, next action, blockers; update before ending a session)

## Commands
- Test: `npm run test` (Vitest); `npm run check` runs typecheck, lint, test and build together
- Lint/format: `npm run lint` (ESLint and a Prettier check); `npm run format` rewrites files with Prettier
- Run: `npm run dev` (dev server with hot reload); `npm run build` then `npm run preview` serves the production build under `/spellwire/`

## Constraints
- Gameplay rules live in `src/core/` as plain TypeScript with no Phaser imports. Phaser code lives in `src/game/` and `src/ui/`.
- Content and tuning values live in validated JSON under `src/data/`.
- `main` always works. Each milestone uses a short-lived branch and a PR, merged only after product-owner approval.
- No personal identifiers anywhere in the repo, commits or published material. Refer to people by role (product owners, co-designer). Commit with a GitHub no-reply email address.
- Commits and PRs carry no AI attribution (no Co-Authored-By or Claude-Session trailers).
- Do not add features outside docs/spec.md; parked ideas need explicit owner approval.

## Working rules
- Work only on the milestone named in the prompt; make the smallest coherent change.
- Report what changed, what was tested, results, and what is unverified.
- Private notes go in .private/ (Git-ignored). Never commit secrets.
- If the spec is ambiguous, stop and ask.
