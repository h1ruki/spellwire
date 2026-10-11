# Spellwire: Phase 3 Development Plan

> **Public version.** Privacy-reviewed copy of the *Phase 3 Development Plan* (reconciled 11 October 2026), the approved technical and development plan. If it conflicts with [spec.md](spec.md) on product scope, the spec wins pending a documented product-owner decision. Personal identifiers have been removed; people are referred to by role (the product owners, the lead product owner, the co-designer). Gameplay and scope decisions are unchanged from the approved original.

**Original plan:** 9 October 2026  
**Reconciled:** 11 October 2026  
**Product owners:** the lead product owner and the co-designer  
**Status:** Phase 3 decisions reconciled, including the three owner confirmations on 11 October 2026; implementation not yet authorised.

Spellwire will be built in small, playable increments, with the product owners accepting each significant milestone. Development will take place in flexible sessions; **there is no fixed weekend or one-week completion deadline**. The **approximately six-minute in-game run** is a separate gameplay target, not a development deadline.

The locked *Spellwire — Phase 2 Locked Concept* remains the authoritative product specification. This plan records the chosen technical approach and proposed implementation sequence; if the documents conflict on product scope, Phase 2 takes precedence pending a documented product-owner decision. The project kickoff skill governs workflow, not gameplay design.

## Approved Phase 3 direction

The decisions below were accepted in the Phase 3 discussion. The final outstanding decisions—dash invulnerability, healing on Skip and the code licence—were resolved by the product owner on 11 October 2026.

- [x] **Gameplay contract (agreed 11 October)** below: XP crystals from every kill, continuous spawning that builds to a boss, a 6-minute run with endless mode after the boss.
- [x] **Stack (decided 11 October):** a browser game in TypeScript with the Phaser engine, built with Vite, hosted free on GitHub Pages. Rust is saved for a follow-up balance simulator.
- [x] **Architecture:** gameplay rules and calculations are kept independent of Phaser; Phaser handles runtime scenes, input, physics/collisions, visuals and audio.
- [x] **Milestones M0 to M6**, each ending in something playable.
- [x] **Look and sound:** neon geometric shapes drawn in code, generated sound effects, only free-to-use (CC0) music.
- [x] **Workflow:** one branch and pull request per milestone, reviewed by you, with automatic checks.
- [x] **AI guide:** which model and reasoning level for which kind of task.
- [x] **Repository:** `spellwire` has **already been created** under the owner's GitHub account. Inspect and reuse it; **do not reinitialise it** or assume that scaffolding has already been committed.

## Gameplay contract

A run lasts about six minutes: survive a growing horde, assemble a loadout through approximately eight upgrade opportunities, then defeat a boss. Six initial component types are supplemented by stat-boost offers; playtests must establish whether this offers enough meaningful variety rather than assuming it does. All numerical values are initial tuning candidates, not immutable balancing decisions. The co-designer helps tune them through playtesting.

**The run, minute by minute**

1. **0:00** Plain gun, swarmers trickle in.
2. **About 0:30** First upgrade choice.
3. **2:00** Brutes join the swarmers.
4. **3:00** Element-resistant enemies appear, so your element choice starts to matter, and a mini-boss arrives.
5. **4:30** A **horde surge**: a larger enemy wave testing the current build. This is **not** the deferred random *wild surge* weapon mechanic.
6. **5:30** The boss arrives. Beat it to win, then end the run or carry on in endless mode against an ever-growing horde for a high score. Reach 0 health and you lose. One key restarts.

**Rules**

| Topic | Agreed behaviour or starting tuning value |
| --- | --- |
| Movement | WASD, 8 directions. Diagonals are normalised so moving diagonally isn't faster. |
| Dash | Space, short burst, initially 1.5 s cooldown (2.5 s with an On Dash build). **No invulnerability during the dash by default.** Dash invulnerability is reserved for a possible future upgrade, not the initial playable build. |
| Basic shot | Fires automatically towards the mouse cursor, initially around 3 shots per second. Mouse direction controls aim; no fire button is needed. The base shot never stops when a trigger is equipped. |
| Earning upgrades | Kills drop XP crystals: normal 1, elite 3, mini-boss 15, boss 50 (tunable starting values). Collecting XP fills a bar; level-up pauses play for an offer. Tune the early curve for the first upgrade around 0:30. |
| Upgrade offer | 3 cards, a before-and-after slot preview and a **Skip** option. **Skipping restores a small, tunable amount of health**, capped at the player's maximum health; playtest the trade-off so Skip does not dominate ordinary upgrades. |
| Card pool | The 6 target parts plus simple stat boosts (fire rate, damage, move speed, max health, pickup range); evaluate meaningful choice frequency through playtesting. |
| Slots | One loadout with initially empty trigger, modifier and payload slots. A new part in an occupied slot replaces the previous one, which is lost for the run. |
| Every Second | Adds an enhanced shot once per second, initially bigger and double damage, without disabling the basic shot. |
| On Dash | Every dash adds a ring of 8 current bullets (starting value) in exchange for the longer cooldown. |
| Split | A spread of 3 shots, initially 55% damage each (tunable). |
| Homing | Shots curve towards a nearby enemy, easing precise aiming. |
| Fire | Initially +15% direct damage plus a 3-second burn. |
| Frost | Lower direct damage and initially a 40% slow for 2 seconds. |
| Resistance | Resistance weakens burn or slow (initially about half); no elemental immunity. |
| Health | Initially 100 health, contact damage, short post-hit invulnerability. |

**Enemies for the initial complete run**

| Enemy | Behaviour | Tests |
| --- | --- | --- |
| Swarmer | Fast, fragile, arrives in groups | Area damage, Split |
| Brute | Slow, tough, hits hard | Focused damage, Fire |
| Ember | Swarmer variant that resists Fire | Not relying on one element |
| Frostback | Brute variant that resists Frost | Not relying on one element |
| Boss | Large, two attack patterns, name and look chosen by the co-designer | Everything |

The resistant variants can reuse their base enemy's movement and attack behaviours, with adjusted effects and clear visual differentiation. They are cheaper than entirely new enemy types, but still require testing for readability and resistances.

Elites (from around 2:00) are visually distinct, tougher variants. The 3:00 mini-boss is planned as a giant Brute with a charge attack. These can reuse existing systems, but both still require encounter tuning and collision/playtest validation.

### Scope boundaries for the flexible development period

These are **scope priorities, not calendar deadlines**. The original Phase 2 document calls them *weekend* tiers; with the owners now choosing flexible development, their **relative priority remains unchanged**.

| Priority | Scope |
| --- | --- |
| Essential | Mouse-directed auto-fire, WASD and dash, one arena, escalating threats, an upgrade-and-replace interface, and a complete run with win/lose outcomes |
| Initial target | One loadout with a plain basic shot, Every Second and On Dash triggers, Split and Homing modifiers, Fire and Frost payloads |
| **First stretch goal** | **A second modifier slot** unlocked during the run, so Split + Homing synergy becomes possible after the one-slot core works |
| Further stretch | Electric and Void, Pierce and Chain, and eventually a second loadout (not required for the initial complete game) |
| Later | Frostfire/cross-loadout reactions, fusion, wild surges, mastery, cooldown ultimates, **optional dash invulnerability upgrade**, rule-breaking legendaries and the separate balance simulator |

The six target parts produce **eight theoretical fully populated three-part configurations**, not necessarily eight distinct playstyles. The priority is demonstrably different, enjoyable weapon behaviours rather than filling out a catalogue.

## Engine and stack

Recommendation: **Phaser (2D game framework) with TypeScript, built with Vite, deployed to GitHub Pages.** The game runs in any browser, so anyone plays it by opening a link, and the portfolio repo gets a "play it now" button.

Why this fits:

- **Fast feedback:** local development supports hot reload, allowing the co-designer to see many changes immediately (actual reload speed varies).
- **Everything is text:** code, data and tuning live in files, which is where Claude Code works best. Engines that rely on a visual editor slow AI-assisted work down.
- **Nothing to install for players:** a link works on any laptop; no downloads or app stores.
- **Phaser covers the boring parts:** input, scenes, collisions, sound, tweens and object pooling come built in.
- **TypeScript catches mistakes early:** a typo in a part definition fails before the game runs.

| Option | Strength | Why not first choice |
| --- | --- | --- |
| **Phaser + TypeScript** | Fast web iteration, text-only, free hosting | Less built-in tooling than a full engine |
| Godot 4 | Excellent free engine with a visual editor | Editor-centred work suits AI less; web export is heavier |
| PixiJS + our own engine | Maximum control, great rendering | We would rebuild input, collisions and scenes ourselves |
| Unity | Industry standard | Heavy install, binary scene files, slow web builds |

Target platform: desktop browsers with keyboard **and mouse**. Mobile and controller support are outside the initial playable scope.

## Architecture and repository structure

Game rules and calculations should live in plain TypeScript without importing Phaser. Phaser owns scene orchestration, input, collision/physics integration, sound and rendering; the core defines gameplay outcomes. This separation makes loadout interactions easier to unit-test without inventing a general-purpose game engine.

- **Core (rules):** loadouts, parts, damage, elements, resistances, upgrade offers, the spawn schedule. Pure functions and data, unit-tested, no graphics.
- **Data (content):** part definitions, enemy definitions and designer-facing tuning values in portable JSON, validated when loaded. The co-designer can change a number and quickly test its effect. The format may be reusable by a later Rust simulator, but no simulator-specific infrastructure is required now.
- **Game (Phaser):** scenes, sprites, collisions, effects, input. It asks the core what happens and shows it.
- **Seeded randomness:** control the game's random draws so given inputs can produce repeatable random sequences in tests. **A seed alone does not guarantee identical full-game replays**; those would also require controlled timing/input and state.
- **Safety limits:** establish sensible caps on projectiles, triggered effects and enemy populations. Use pooling where profiling or observed allocation pressure justifies it; do not require a full pooling framework before the game loop exists.

```text
spellwire/
  src/
    core/        loadout, parts, damage, elements, offers, spawner, rng
    data/        parts.json, enemies.json, tuning.json   (the co-designer's playground)
    game/        scenes (Boot, Arena, Upgrade, End), entities, effects
    ui/          HUD, upgrade cards, end screen
  tests/         unit tests for core/
  public/        sounds, fonts
  docs/          design notes, decision log, credits
  .github/       CI: typecheck, lint, test, build, deploy
  README.md
```

Keep the initial implementation small: no backend, accounts, persistent saves, or additional UI frameworks unless a demonstrated requirement justifies them.

## Milestones

Seven milestones, ordered by dependency rather than a Saturday/Sunday schedule. **There is no fixed completion deadline**: work in manageable sessions, pause safely at stable checkpoints, and make progress contingent on actual acceptance rather than elapsed time. M0–M1 establish the playable foundation; M2–M4 establish Spellwire's identity; M5 completes the game loop; M6 polishes its presentation.

1. **M0: Setup.** Inspect and reuse the **existing** repo; add Vite, Phaser, strict TypeScript, minimum tests and CI, and configure GitHub Pages. A lightweight rendering smoke check is optional if quick.
   - Done when: a local build shows a movable coloured square and relevant checks pass; **after the owner-approved PR merge**, verify that the GitHub Pages link serves the same playable scene. A synthetic 60 FPS load benchmark is **not** an M0 gate.
   - Co-designer: picks the player's shape and colour.
2. **M1: Move and shoot.** WASD with diagonals, dash on Space with cooldown, auto-fire aimed at the mouse cursor, swarmers that chase, health and death.
   - Done when: you can dodge, dash and kill swarmers, and dying shows a restart prompt.
   - Co-designer: tunes move speed, dash distance and fire rate in the tuning file.
3. **M2: Horde and XP.** Spawn schedule, brutes, XP crystals, XP bar, and focused hit feedback such as flashes, knockback and restrained screen shake.
   - Done when: the run gets progressively harder, XP can be collected and progression is visible; the combat can be playtested for responsiveness. The six-minute end condition comes in M5.
   - Co-designer: designs the spawn timeline and decides how much shake is too much.
4. **M3: Loadouts (the heart of Spellwire).** Loadout rules in core, Fire and Frost payloads, the upgrade screen with 3 cards, preview and Skip (with its small health restoration).
   - Done when: a new player can replace **Fire with Frost (or vice versa)** and immediately understand and feel the changed elemental behaviour, with the basic shot remaining functional. This is the **elemental acceptance test**.
   - Co-designer: chooses the element colours and effects, and names the parts.
5. **M4: Modifiers and triggers.** Split, Homing, Every Second, On Dash with its cooldown trade-off, stat-boost cards, Ember and Frostback enemies.
   - Done when: a new player can replace **Split with Homing (or vice versa)** and immediately recognise the difference in projectile behaviour. At least four combinations have visibly different strengths; element-resistant enemies reward adaptation without imposing immunity. This is the **locked core modifier acceptance test**.
   - Co-designer: official balance tester, hunting for a broken build.
6. **M5: A complete run.** Boss, win/lose flow, run summary, sound effects, and an initial tuning pass.
   - Done when: a complete run has a beginning, escalating threats, a climactic encounter and an ending; **different viable builds demonstrate strengths in different encounters**, and both owners accept the gameplay. Endless mode, already agreed, should not delay a satisfying finite win/lose loop.
   - Co-designer: designs and names the boss and its two attacks.
7. **M6: Presentable.** Title screen, README with GIF, credits, final polish.
   - Done when: a stranger can open the link, understand it and play without help.
   - Co-designer: records the GIF and writes a line for the README.

Each milestone should end in a reproducible playable/observable result, relevant green checks, a short playtest and **explicit product-owner acceptance**. Use a short-lived branch and PR for each substantial milestone; merge only after approval. **Version tags are for meaningful releases**, not every intermediate milestone. If work stops mid-milestone, leave the repository in a documented, safely resumable state.

## Testing

Test the rules automatically and the fun by hand. Automated tests cover the core, where bugs are hard to spot by playing; playtests cover feel, which no test can judge.

- **Unit tests (Vitest) on the core:** Split applies its configured damage distribution; element resistance reduces configured burn/slow effects; an offer never forces replacement without Skip; **Skip heals by the configured amount without exceeding maximum health**; effect budgets prevent runaway work when chained effects exist; seeded random draws reproduce sequences under controlled inputs. Do not claim deterministic full-run replay from a seed alone.
- **Data checks:** every part and enemy in the data files is validated on startup, so a typo shows a clear error instead of a strange bug.
- **Smoke test:** once browser automation is available, open the built game and confirm it starts without errors; keep the initial check proportional to setup effort.
- **Continuous integration:** every pull request runs typecheck, lint, tests and a build; nothing merges while it is red.
- **Playtest checklist per milestone:** a few written questions (Did the first upgrade come quickly? Could you tell Fire from Frost?), answered by the product owners after playing.
- **Performance check:** use a **time-boxed optional M0 rendering smoke test** only if useful. Conduct representative combat performance checks during **M4–M5**, with actual enemy behaviour, collisions, projectile modifiers and effects. Test on the intended laptop/browser, record observed frame times/FPS and adjust only when evidence justifies optimisation. A synthetic 300-enemy/400-projectile test is not an M0 pass/fail gate.

## Visual identity, audio and licensing
> **Amended 11 October 2026:** the visual direction is now 16-bit-inspired pixel art with modern magical effects; see docs/decisions.md. The neon-geometric guidance below is superseded; its readability principles, audio and licensing guidance still apply.

A neon "magical machinery" look built from glowing geometric shapes drawn in code, which looks sharp, needs no art assets and has no licensing risk.

- **Visuals:** dark arena, the player as a bright glyph, enemies as distinct shapes (swarmers as small triangles, brutes as heavy hexagons). Each element owns a colour and a particle effect: Fire in orange embers, Frost in pale blue shards. The co-designer picks the palette.
- **Readability first:** element colours stay consistent everywhere (bullets, cards, enemy resistance tints), so players learn them without reading.
- **Sound effects:** generated with a free sound-effect generator (sfxr style), whose output is free to use. The co-designer can make and choose them.
- **Music:** a verified CC0 track (with source recorded) or no music for the initial release.
- **Fonts:** one Google Font under the Open Font License.
- **Licences:** **MIT is approved for Spellwire's original source code**; include a standard `LICENSE` file. External music, fonts, sound effects and other third-party assets retain their own licences and must be checked and recorded in `docs/CREDITS.md` (the MIT code licence does not automatically relicense them). Do not copy assets from other games or misrepresent AI-generated art as hand-made.

## Git, code review and documentation

Light professional habits that make the repository credible without slowing two people down.

- **Branches:** `main` always works and is what's deployed. Each milestone or feature gets a short-lived branch (`m3-loadouts`, `fix-dash-cooldown`).
- **Pull requests:** one per milestone or feature, with a short description and a GIF or screenshot when something visible changes. You review and merge; the co-designer watches the review and helps decide.
- **Automatic checks:** typecheck, lint, tests and build must pass before merging.
- **Commits:** small, with clear messages in the Conventional Commits style (`feat: add frost payload`, `fix: dash cooldown resets on death`). Squash-merge each pull request so `main` reads as a clean history.
- **Versions:** tag meaningful preview or release builds, with concise release notes as warranted. Do not tag every internal milestone automatically.
- **Docs that earn their place:** a README (what it is, play link, GIF, how to run, how it's built), the approved specification in `docs/spec.md` or a clear equivalent, a concise decision log and `docs/CREDITS.md`. Avoid competing authoritative design files.
- **Honesty about AI:** the README should accurately describe how the humans and models contributed, without exaggerating automation or implying work was independently verified when it wasn't.
- **Two-layer build log:** after a *noteworthy* work session, capture a brief **private** note with actual model handoffs, decisions, changes and evidence. Store private notes outside public Git history or in a Git-ignored location. Publish an **optional** curated, evidence-backed project case study only after the lead product owner reviews and approves it. Routine sessions need no log entry.

## Which AI, at what reasoning level, for which task

Use the strongest model where decisions shape everything after them, and a faster one for well-defined work. Claude Code builds; ChatGPT and Claude Chat review at milestone gates.

| Task type | Example | Who | Model and effort | Why |
| --- | --- | --- | --- | --- |
| Creative design | New parts, boss ideas, element effects | The product owners, with Claude Chat or ChatGPT | Default settings | The ideas are yours; AI widens the options |
| Architecture | M0 setup, the core loadout model in M3 | Claude Code | Opus 5.5, high | Early structure decides how easy everything later is |
| Complex implementation | Loadout rules, upgrade offers, spawn schedule, Split with Homing | Claude Code | Opus 5.5, high | Interacting systems hide subtle bugs |
| Routine coding | HUD, end screen, a new enemy variant, sound hookup | Claude Code | Sonnet 5.5, medium | Clearly specified work; faster and cheaper |
| Tuning | Numbers in the tuning file | Co-designer, by hand | None | It's play, not programming |
| Debugging | Something behaves oddly | Claude Code | Sonnet 5.5, medium first; Opus 5.5, high if that fails | Most bugs are simple; escalate only when needed |
| Independent review | End of M3 and M5, before going public | Claude Chat or ChatGPT on the pull request, plus Claude Code's code review | Strongest available | Fresh eyes catch what the author misses |
| Mechanical tasks | Tags, changelog, formatting | Claude Code | Haiku 5.5, low | No reasoning needed |

Choose models by the task's actual difficulty and availability at execution time; model names in this table are starting recommendations, not permanent requirements. Reserve high effort for work that justifies it. Seek substantive independent scrutiny at M3, M5 and release readiness, with lighter proportional checks elsewhere. ChatGPT remains the strategic scrutiniser at important gates, and the product owners retain product ownership.

## Extensions after the core gameplay works

Extensions are ordered by value and dependency, **not by a fixed date**. Only implement them after the core milestones meet their acceptance criteria and the owners authorise the work.

**First optional extension during the initial project:**

1. **Second modifier slot**, unlockable during a run, enabling Split + Homing. This is the **highest-priority stretch**, not a requirement for M0–M5 acceptance.

**Further optional extensions / later releases:**

2. Electric and Void payloads; Pierce and Chain modifiers.
3. A second loadout, enabling future Frostfire reactions across loadouts.
4. The co-designer's cooldown special: defensive burst or offensive ultimate, with time manipulation as a potential ultimate. Dash invulnerability may also be introduced as an **optional upgrade**, never as baseline dash behaviour.
5. Fusion of duplicate parts, then rare wild surges.
6. Training bonuses and rule-breaking legendaries; eventually a separate Rust balance simulator that may reuse the same validated JSON content.

These features remain **parked**, not implied authorisations from appearing in the roadmap.

**Public release checklist:**

- [ ] Playable link on GitHub Pages and a title screen with controls shown.
- [ ] README with a GIF, the hook in one sentence, how to run it, architecture summary and how AI was used.
- [ ] Tests and CI green; no console errors.
- [ ] Credits and licences complete.
- [ ] Smooth on a normal laptop with a full screen of enemies.
- [ ] One round of feedback from people outside the development team.
- [ ] A short write-up or LinkedIn post: what you built, what the co-designer designed, what you learned.

## Phase 4: focused validation before and during implementation

Keep validation short and tied to real risk. These checks may be performed during M0 rather than treated as a separate research project:

1. **Phaser/version compatibility:** confirm a stable Phaser 3 release and a working Vite + strict TypeScript setup; pin the chosen version.
2. **Deployment:** verify that GitHub Pages serves the existing repository's built game correctly, with the right base path and CI permissions.
3. **Performance:** at most a lightweight M0 rendering smoke check if quick; defer representative gameplay loading and optimisation until M4–M5.

No broad research audit is required for a game without external analytical datasets.

## Final owner confirmations (11 October 2026)

- **Dash invulnerability:** **not part of the baseline dash**. A future upgrade may grant it, but that upgrade is **not authorised for the initial build**. The separate, short post-hit invulnerability remains a health/damage rule.
- **Skip healing:** **approved**. Skipping an upgrade restores a small, tunable amount of health, never above the health cap.
- **Open-source licence:** **MIT approved for original code**. External assets remain subject to their respective licences.

These decisions close the three outstanding Phase 3 confirmations. The upcoming kickoff should reconcile this plan with the existing repository and the locked Phase 2 specification; it must not restart ideation or silently add features. Implementation still requires the owners' approval at the appropriate gate.
