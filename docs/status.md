# Status

**Kickoff stage:** 6 (implementation).
**Milestone:** M0 (setup) complete: merged, deployed and verified at https://h1ruki.github.io/spellwire/ on 11 October 2026.
**Milestone:** M1 (move and shoot) complete: merged, deployed and verified on 11 October 2026.
**Milestone:** M2 (horde and XP), in review on branch `m2-horde-and-xp` (PR "M2: horde and XP").

## Next actions
1. Product owners playtest M2 (locally, or from the pull request branch) against the checklist in the pull request.
2. Product owners review the M2 pull request and, if accepted, merge it.
3. After the merge, confirm the Deploy workflow succeeds and the play link shows M2.
4. Co-designer designs the spawn timeline in `src/data/spawns.json` and decides how much screen shake is too much (`hitFeedback` in `src/data/tuning.json`).
5. Product owners authorise M3.

## Notes
- Level-ups in M2 only show a notice. That is temporary: M3 replaces it with the approved pause-and-upgrade-offer interaction.
- The visual direction changed to 16-bit-inspired pixel art (see docs/decisions.md). The code-drawn shapes are placeholders; no art pipeline exists yet.

## Blockers
- None.
