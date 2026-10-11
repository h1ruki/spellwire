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
