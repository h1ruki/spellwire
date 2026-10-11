# Status

**Kickoff stage:** 6 (implementation).
**Milestone:** M0 (setup) complete: merged, deployed and verified at https://h1ruki.github.io/spellwire/ on 11 October 2026.
**Milestone:** M1 (move and shoot) complete: merged, deployed and verified on 11 October 2026.
**Milestone:** M2 (horde and XP) complete: merged, deployed and verified on 11 October 2026.
**Milestone:** M3 (loadouts), in review on branch `m3-loadouts` (PR "M3: loadouts").

## Next actions
1. Product owners playtest M3 (locally, or from the pull request branch) against the elemental acceptance test and the checklist in the pull request: can a new player replace Fire with Frost, or Frost with Fire, and at once understand and feel the change?
2. Product owners review the M3 pull request and, if accepted, merge it.
3. After the merge, confirm the Deploy workflow succeeds and the play link shows M3.
4. Co-designer names the parts and picks the element colours in `src/data/parts.json`, and tunes the boost amounts in `src/data/boosts.json`.
5. Product owners authorise M4.

## Notes
- Stat-boost cards moved from M4 to M3 by product-owner decision (see docs/decisions.md). M4 keeps Split, Homing, Every Second, On Dash, Ember and Frostback.
- The trigger and modifier slots exist in the loadout and on screen but stay empty until M4.
- While the payload slot is empty every offer is Fire, Frost and one stat boost. This reading of the first-offer rule is recorded in docs/decisions.md and is open to owner feedback.
- The visual direction changed to 16-bit-inspired pixel art (see docs/decisions.md). The code-drawn shapes and element effects are placeholders; no art pipeline exists yet.

## Blockers
- None.
