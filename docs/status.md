# Status

**Kickoff stage:** 6 (implementation).
**Milestone:** M0 (setup) complete: merged, deployed and verified at https://h1ruki.github.io/spellwire/ on 11 October 2026.
**Milestone:** M1 (move and shoot) complete: merged, deployed and verified on 11 October 2026.
**Milestone:** M2 (horde and XP) complete: merged, deployed and verified on 11 October 2026.
**Milestone:** M3 (loadouts), in review on branch `m3-loadouts` (PR "M3: loadouts"). The first owner playtest led to four approved amendments, now on the branch: Fire 125% and Frost 110%, gain/loss comparisons on upgrade cards, a finite scrolling world with a bounded follow camera, and tuning of swarmers and brutes (see docs/decisions.md).

## Next actions
1. Product owners playtest M3 again (locally, or from the pull request branch) against the elemental acceptance test and the checklist in the pull request: can a new player replace Fire with Frost, or Frost with Fire, and at once understand and feel the change? The second playtest should also judge the larger world, the camera at its edges, and whether swarmers are fairer to hit and brutes more of a threat.
2. Product owners review the M3 pull request and, if accepted, merge it.
3. After the merge, confirm the Deploy workflow succeeds and the play link shows M3.
4. Co-designer names the parts and picks the element colours in `src/data/parts.json`, and tunes the boost amounts in `src/data/boosts.json`.
5. Product owners authorise M4.

## Notes
- Stat-boost cards moved from M4 to M3 by product-owner decision (see docs/decisions.md). M4 keeps Split, Homing, Every Second, On Dash, Ember and Frostback.
- The trigger and modifier slots exist in the loadout and on screen but stay empty until M4.
- While the payload slot is empty every offer is Fire, Frost and one stat boost. This reading of the first-offer rule is recorded in docs/decisions.md and is open to owner feedback.
- docs/plan.md still lists Fire as +15% and Frost as "lower direct damage" in its rules table. It was not edited; the playtest amendment in docs/decisions.md supersedes those two values.
- The player can outrun every enemy across the larger world, and enemies left behind keep chasing and count towards the enemy cap. Whether that needs a rule is a question for the playtest.
- The visual direction changed to 16-bit-inspired pixel art (see docs/decisions.md). The code-drawn shapes and element effects are placeholders; no art pipeline exists yet.

## Blockers
- None.
