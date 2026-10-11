# Spellwire — Phase 2 Locked Concept

> **Public version.** Privacy-reviewed copy of the *Phase 2 Locked Concept*, the authoritative product specification. Where it says *weekend*, read *priority tier*: the owners later chose flexible development with no deadline, and the tiers' relative priority is unchanged. Later owner decisions (11 October 2026): normal dashing grants no invulnerability, which is reserved for a future upgrade; skipping an upgrade restores a small amount of health; the code is MIT-licensed. Technical and development decisions are in [plan.md](plan.md). Personal identifiers have been removed; people are referred to by role (the product owners, the lead product owner, the co-designer). Gameplay and scope decisions are unchanged from the approved original.

**Locked:** 9 October 2026  
**Product owners:** the lead product owner and the co-designer  
**Status:** Phase 2 complete; Phase 3 technical and development planning pending.

This is the authoritative **product and scope** record for Spellwire. It supersedes the preliminary Spellwire proposal in *Phase 1: Game Concepts*. It does not prescribe a technical stack or authorise implementation. Any change to a locked product decision requires approval from the product owners. Decisions explicitly marked *Phase 3* still need to be made.

## Product identity and success

**Spellwire** is a top-down survivor roguelite in which players construct a weapon **loadout** from a **trigger**, one or more **modifiers**, and an elemental **payload**. A plain gun begins each run; collecting parts transforms its behaviour. The point is to discover effective, surprising combinations while surviving escalating encounters.

- **Weekend success:** The co-designer can play a complete run, change a weapon part, immediately see and feel the difference, and want to play again.
- **Portfolio success:** A polished, publicly playable game with understandable modular design, reproducible builds, meaningful tests, clear documentation, and an evidence-based account of the multi-model development process.
- **Priority:** Fun, the co-designer's creative participation and a complete playable experience come before additional mechanics or portfolio polish.

## Locked gameplay contract

### Controls and combat

- **Mouse-directed auto-fire is approved.** The weapon fires automatically towards the mouse cursor; the player aims with the mouse but does not press a fire button.
- **Movement:** WASD, including diagonal movement (for example, W + D moves north-east).
- **Dash:** Space; every dash has a baseline cooldown. The precise movement and cooldown values are Phase 3 tuning decisions.
- **Upgrade choices:** The player selects parts or skips offers. There is no manually activated ultimate or additional combat control in the initial playable.

### Starting weapon and triggers

- The player begins with **one loadout**: a plain, non-elemental gun and **one empty trigger slot, one empty modifier slot and one empty payload slot**.
- The gun's **basic automatic shot always remains available**. Installing components transforms that shot: Frost makes frost bolts; Split changes projectile behaviour. A conditional trigger must never disable the basic shot.
- **Triggers add attacks beyond the basic shot:**
  - **Every Second:** adds a periodic enhanced or additional attack. Its precise effect and damage are determined in Phase 3.
  - **On Dash:** fires an extra burst of the current bullets when dashing. It offers extra damage in exchange for a longer dash cooldown; exact burst and cooldown values are determined in Phase 3.
- **On Kill** is deferred; it cannot start a fight independently without another reliable damage source. **On Taking Damage** is also deferred because it can reward intentionally taking hits.

### Slots, progression and replacement

- **Loadout** is the agreed name for one trigger + modifier(s) + payload configuration.
- Part slots are limited; increasing available slots is itself a progression reward.
- An acquired part can be installed in the appropriate slot. If the slot is occupied, **the new part replaces the previous one, which is lost for that run**.
- Before accepting a part, the player can see what it replaces and what will change, choose the relevant slot, or **skip**. The preview and confirmation interaction is to be designed in Phase 3.
- **First playable:** one loadout with one modifier slot.
- **High-priority weekend stretch:** unlock a **second modifier slot** to demonstrate modifier synergy (such as Split + Homing). It is **not** required for the first playable.
- **Further weekend stretch:** a second loadout. A progression ceiling of roughly **three loadouts with two modifiers each** is a longer-term direction, not a weekend commitment. When and how slots unlock remains a Phase 3 decision.

### Elements

- **Fire (initial target):** damage over time and increased damage output.
- **Frost (initial target):** slows enemies.
- Enemies may **resist** an element, reducing its effect; they are **never immune**. Exact magnitudes are tuned during development.
- **Electric and Void (stretch/future):** must eventually play differently, not merely look different. Provisional roles: Electric bursts and arcs to nearby enemies; Void marks targets to take extra damage. The co-designer may refine these before implementation. Electric's innate arc must not make a later **Chain** modifier redundant.
- A loadout has **one elemental payload**. Future **cross-loadout reactions** are deterministic and learnable: for example, a Frost attack chills an enemy and a Fire attack subsequently causes **Frostfire**. These reactions are **not part of the initial weekend target**.

## Balance and upgrade principles

1. **Useful specialisation, not equal power.** Every build should have strengths and weaknesses: area attacks against hordes, focused damage against durable targets, control against fast enemies. Mixed threats discourage a universal best build.
2. **Trade-offs.** Strong parts cost something: a slot, firing speed, a harder trigger or a similar limitation.
3. **Diminishing returns.** For example, a three-way Split might deal about 55% of normal damage per child. That figure is an illustrative balance starting point, not a locked constant.
4. **Safe interactions.** Cap chain depth, effects or events as needed to avoid infinite loops and severe slowdown.
5. **Viable upgrade offers.** Bias offers towards useful choices for the existing loadout, aim for at least one meaningful choice per offer, and **always allow skipping**. Never force the player to destroy a working build.

**Power outcomes to distinguish:**

| Outcome | Treatment |
| --- | --- |
| Extraordinary synergy: an unusual combination makes one run spectacular | Encourage it |
| Dominant strategy: the same combination wins regardless of situation | Design against it |
| Broken interaction: infinite effects, crashes or unplayable slowdown | Prevent with safeguards |

**Rarity rewards unusual mechanics**, not simply larger damage numbers. Playtest before fine-tuning balance. The co-designer is the designated balance tester, including finding a powerful or broken combination and proposing a fix that preserves the fun.

## Weekend scope — authoritative

| Level | Commitment |
| --- | --- |
| **Essential** | Movement, mouse-directed automatic shooting, dash, one arena, escalating enemies; an upgrade-and-replacement interface; a complete run with win and lose outcomes |
| **Target** | Plain starting gun; **two triggers** (Every Second, On Dash); **two modifiers** (Split, Homing); **two elemental payloads** (Fire, Frost); **one loadout** |
| **High-priority stretch** | Unlocking a **second modifier slot** within the first loadout |
| **Other stretch** | Electric and Void, Pierce and Chain, additional modifiers, **second loadout** |
| **After the weekend** | Duplicate-part fusion, fixed elemental reactions including Frostfire, and rare wild surges. One Frostfire demonstration is optional only if the playable game is already sound |
| **Longer term** | Training/mastery, cooldown specials and ultimates, rule-breaking legendary parts, a balance simulator, and other parked ideas |

The six target parts represent **eight theoretical fully populated, three-part configurations** (two triggers × two modifiers × two payloads). They do **not** guarantee eight distinct playstyles; empty slots and the basic attack are separate possibilities. **Around twelve parts is an upper target, not a requirement.**

**Scope risk to address in Phase 3:** six parts, permanent replacements and skips may not sustain interesting decisions throughout a 5–8-minute run. Validate upgrade pacing and variety in playtests before adding content or introducing new progression mechanics.

## Run and acceptance criteria

- **Run length:** target 5–8 minutes.
- **First upgrade:** approximately 30 seconds into the run.
- The player must see a clear difference when changing a modifier; movement and combat must remain responsive and understandable.
- **Core acceptance test:** someone unfamiliar with Spellwire changes a modifier and immediately understands and feels the change. If that fails, additional parts will not solve the problem.
- Every meaningful development milestone should produce something observable or playable; the product owners decide whether the result is acceptable.

## Approved future direction and idea provenance

These ideas are **preserved, not authorised for the first playable**.

| Idea | Contributor | Status or agreed interpretation |
| --- | --- | --- |
| Rule-breaking rare parts (three modifiers in a loadout; two modifiers sharing a slot; a kill that triggers another loadout) | ChatGPT | Parked; unusual mechanics rather than numerical upgrades |
| Conflicting element builds with random outcomes and an occasional explosion | Co-designer | **Superseded:** reactions are fixed and learnable, rather than randomly overriding a choice |
| Fuse duplicate parts, then combine upgraded parts into otherwise unavailable weapons | Co-designer | After the weekend; evolution/fusion concept retained |
| Four distinct powers: Fire, Frost, Electric and Void, affecting interactions and resistances | Co-designer | Fire/Frost first; Electric/Void later; resistance **never** immunity |
| Train powers through use, specialising in some over others | Co-designer | After the weekend; **bonuses for trained powers only**, with no weakening of untrained ones. Opportunity cost supplies the trade-off |
| A cooldown ability slot offering a defensive area-stun escape burst **or** an offensive ultimate | Co-designer | Future feature; would introduce an additional control |
| Time manipulation that slows enemies but not the player | Co-designer | Future ultimate candidate |
| A rare **wild surge** on a built loadout | Concept refinement | After the weekend: an exceptional explosion or a self-damaging backfire; firing-rate-aware odds, visible indication, and backfire alone cannot end the run. Distinct from deterministic elemental reactions |
| A power budget per loadout | Project planning | Parked until balancing needs justify it |
| A scenario-based balance simulator and actual play data | Project planning | Future: evaluate more than dummy-target DPS; no weekend requirement |
| A visible machine, boss-design tools, echoes of previous rounds | Ideas from other concepts | Parked; not part of the approved first playable |

**Implementation note:** Existing configurable behaviours can use data files, but genuinely new mechanics may still require code. The format and architecture are Phase 3 choices, not Phase 2 commitments.

## Decisions Phase 3 must resolve

1. How upgrades are earned (experience, kills, timed milestones or another agreed approach), their frequency, and whether the six-part target pool supports enough meaningful choices over a full run.
2. Continuous spawning versus discrete waves, and encounter pacing.
3. When additional slots unlock, including whether the second modifier slot is feasible during the weekend.
4. Basic shot and **Every Second** interaction; mouse-aim targeting behaviour; precise **On Dash** burst and dash cooldown trade-off.
5. Minimum enemy variety and how a 5–8-minute run is won or lost.
6. How upgrade comparisons, slot selection, replacement confirmation and skipping work.
7. Projectile, enemy and effect safeguards needed for stable performance without premature optimisation.
8. Testable definition of a complete, presentable weekend build.

Phase 3 should resolve these questions before implementation. Nothing above authorises the addition of unapproved controls, mechanics, progression systems or scope.
