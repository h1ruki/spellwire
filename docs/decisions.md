# Decision log

Locked decisions and the reasons behind them. Details live in [spec.md](spec.md) and [plan.md](plan.md); this log points to them rather than repeating them.

| Date | Decision | Why | Source |
| --- | --- | --- | --- |
| 2026-10-09 | Product concept and scope locked | Agreed by the product owners after ideation | spec.md |
| 2026-10-11 | Stack: TypeScript, Phaser 3, Vite, GitHub Pages | Fast browser iteration, text-only files suit AI-assisted work, free hosting, play from a link | plan.md, "Engine and stack" |
| 2026-10-11 | Gameplay rules in plain TypeScript, independent of Phaser | Loadout interactions can be unit-tested without the engine | plan.md, "Architecture" |
| 2026-10-11 | Normal dash grants no invulnerability; it is reserved for a future upgrade | Owner decision | plan.md, "Final owner confirmations" |
| 2026-10-11 | Skipping an upgrade restores a small, capped amount of health | Owner decision | plan.md, "Final owner confirmations" |
| 2026-10-11 | MIT licence for original code; assets keep their own licences | Owner decision | plan.md, "Visual identity, audio and licensing" |
| 2026-10-11 | No deadline; milestones gated on acceptance, not time | Owner decision | plan.md, introduction |
| 2026-10-11 | No personal identifiers in the repo or published material | Owner decision; the repo is public and Git history is permanent | CLAUDE.md |
| 2026-10-11 | Repo bootstrapped with one direct commit to `main`; all later work through branches and PRs | An empty repo has no base branch for a PR | Kickoff review |
| 2026-10-11 | Phaser pinned to exactly 3.90.0; Node 24 LTS for development and CI (`.nvmrc`, `engines`) | 3.90.0 is the latest stable Phaser 3 release and the approved stack stays on Phaser 3 although Phaser 4 exists; an exact pin and an LTS runtime keep builds reproducible | M0 setup; plan.md, "Phase 4" |
| 2026-10-11 | M1 defaults where the spec is silent. Dash: goes in the movement direction, or towards the cursor when no movement key is held; the direction locks at the start; the 1.5 s cooldown counts from the start of the dash; it needs a fresh keypress and cannot leave the arena. Aim: uses the pointer's world position and keeps the last direction when the cursor is on the player. Swarmers: spawn in small groups just inside a random arena edge at a steady interval, never within a tunable minimum distance of the player, with no escalation. Feedback: the player blinks during post-hit invulnerability. Restart: R, with the prompt "You died. Press R to restart." | The spec and plan leave these details open; the defaults are the simplest predictable behaviour and stay open to playtest feedback. Escalation, knockback and screen shake belong to M2 | M1 executor prompt; plan.md, "Gameplay contract" |
