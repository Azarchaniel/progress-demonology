# Progress Demonology

**v0.0.1** — a playable desktop-first incremental grimoire. Bind twelve orders of entities, inscribe rituals, and march through twelve cities in Ancient Empires and Slavic, sacrificing armies for permanent Dominion.

Built with **TypeScript, Svelte 5, Vite 8, and break_infinity.js**. The interface uses local serif fonts, a pure black background with white lettering, a winged solar seal, stepped ancient gates, monumental typography, and distressed manuscript borders (no gray fills, gradients, translucency, or shaded shadows), and an inline geometric seal; no external font or image downloads are required.

## Run

Use Node.js **22.12 or newer**.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. To build and serve the static version:

```bash
npm run build
python -m http.server 8000 --directory dist
```

Open http://localhost:8000. Alternatively, use `npm run preview`.
The source index.html requires Vite; opening it directly with file:// is unsupported.

For itch.io, zip the **contents** of dist so index.html is at the archive root, then upload as an HTML game. The production build uses relative asset paths for embedded/subdirectory hosting.

## Layout

The Reservoir stays visible in a sticky left sidebar on desktop, including Followers and Fanatics. The right workspace has Summoning, Rituals & Seals, Conquest, and Empires tabs. Switching chapters never pauses simulation. Tabs support Left/Right arrows and Home/End; locked systems display their unlock requirements. On narrow screens the reservoir stacks above the chapters.

## Play

- Draw pentagrams for Essence and Knowledge, then bind Spirits for passive Essence. Drawing rewards scale with Production. Study books while no manual summon is active; automated summons can run alongside study.
- Manual summoning uses one circle; Fanatics add shared capacity for automation. Followers arrive after the first Lesser Demon. Every 5 Fanatics adds a circle, up to 6 in Ancient Empires and 12 after Slavic opens; each Fanatic adds 10% summoning speed. Promotion requires 10 discovered Knowledge and spends Followers and Essence.
- **Research spends both Knowledge and Essence.** The reservoir shows spendable Knowledge and total discovered Knowledge for the current run. Spending on research never relocks discovered books or units. Discoveries reset with conquest.
- **41 upgrades in seven connected branches:** Forbidden Study, Pentagram, Automation, Candles, Sacred Geometry, Incense, and Follower Gain. Some advanced seals require two parents. Ancient research costs reach 35,000 Knowledge and Slavic extensions reach 140,000; two new books unlock at 6,000 and 22,000 discovered Knowledge.
- In Rituals & Seals, drag the map background to pan in two dimensions. Scroll the wheel to zoom around the pointer, use +/−, Fit tree, or Reset view. Touch devices can pan by swiping. Focus the map for arrow-key scrolling and +/− zoom. Select a node to inspect its effect, dependencies, prices, and missing resources; research from its detail panel.
- **Fanatic Training** replaces both Summoning Circles with one repeatable tree node. Each purchase permits the next entity in order: Lesser Spirit, Imp, Familiar, Lesser Demon, Demon, Greater Demon, then the six Slavic entities. The first rank costs 180 Essence + 18 Knowledge; each further rank multiplies Essence price by 3 and Knowledge price by 2. Training caps at 6 until Alexandria, then at 12. At least one Fanatic and the usual Follower gate are needed to run automation. Fanatic count affects speed and circle capacity, while training determines which entities can be automated. Manual summoning retains its existing Knowledge requirements. Individual automated circles can be paused.
- Summon prices grow by 4.5% per owned unit. Higher demons require 300 / 1,800 / 6,000 discovered Knowledge and take 24 / 42 / 72 seconds before speed bonuses.
- Babylon requires 60,000 Army Power. Later defenses are 180,000, 500,000, 1.5 million, 4 million, and 12 million, making advanced research useful through the campaign.
- Conquest advances the city and resets army, Followers, Fanatics, resources, research, discoveries, and automation. Dominion remains and multiplies Essence/Knowledge production and drawing rewards by **1 + Dominion × 0.05**.

The balance regression models active play: one pentagram every ten seconds, decisions every two seconds, alternating study and manual summons, then studying alongside automation. First conquest takes **19:47**, within the revised **15–25 minute** target; the same Babylon benchmark with 10 Dominion takes **12:11**. These are deterministic simulation results, not a guarantee for every strategy or later city.

## Structure

- `src/App.svelte` — progressive manuscript UI, lifecycle, actions, save feedback, confirmations.
- `src/lib/UpgradeTree.svelte` — draggable, zoomable research map and purchase details.
- `src/lib/content.ts` — unit and ritual definitions, prices, gates, tuning constants, and city definitions.
- `src/lib/types.ts` — domain interfaces.
- `src/lib/simulation.ts` — paid summoning, production, automation, modifiers, and prestige.
- `src/lib/cult.ts` — Follower recruitment, Fanatic initiation, speed aid, and shared summoning capacity.
- `src/lib/state.ts` — initial state, versioned serialization, validation, and browser persistence.
- `src/lib/format.ts` — consistent fractional rates, grouped numbers, suffixes, and scientific notation.
- `src/styles.css` — responsive parchment styling and reduced-motion support.
- `tests/game.test.ts` — simulation, save, formatting, and balance regression tests.
- `scripts/test.mjs` — bundles TypeScript tests with esbuild and runs Node's test runner.
- `SPEC.md` — product specification.
- `css/` and `js/` — retained pre-migration files; the Vite entry point does not load these.

## Saves

The browser stores a versioned JSON document under **progress-demonology-save**. Decimal values serialize as strings, preserving very large numbers. Units, paid summons in progress and their order, Followers, Fanatics, recruitment progress, ritual ownership, individual automation pauses, Dominion, current campaign city, victory history, debug settings, spent research Knowledge, the active study source, and save timestamps survive reload.

Autosave runs once every 15 real seconds, plus on page hide and visibility loss. **Save manuscript** provides a manual save. Storage failures appear in the footer. Invalid fields are sanitized; unreadable or unsupported-version documents are copied to **progress-demonology-save-recovery** before a fresh run opens. Earlier 0.0.1 saves retain valid resources, army, upgrades, and Dominion and start the new campaign at Babylon. Old victories do not skip new cities. The unfinished scaffold city index and free-replication progress are not continued. Paid simultaneous summons from older saves are preserved in a queue and only advance when a circle is available. They are never charged again.

**Reset save** in the debug panel requires a second confirmation and clears all active progress, including Dominion. A recovery backup, if one exists, is left intact. Saves are local to each browser and origin; different ports, localhost, 127.0.0.1, and itch.io do not share saves.

No offline progress is implemented. Hidden tabs pause simulation; elapsed time while closed is not awarded. Timestamps and serialization boundaries leave room for a future offline policy.

## Debug controls

Expand **Debug / Development Tools**:

- +1,000 Essence
- +100 Knowledge
- +10 Dominion
- Toggle 10× / 1× simulation speed
- Unlock all units (reveals them without granting owned units)
- Reset save with confirmation

Debug state is saved. Conquest restores normal speed and normal unlock gates.

## Architecture and validation

One requestAnimationFrame loop drives the simulation. Simulation rules mutate a standalone state object; the UI refreshes about 12.5 times per second. Small bounded substeps keep 10× simulation consistent. Progress bars interpolate with CSS, disabled for reduced-motion users. There are no per-unit timers.

Svelte provides declarative rendering and lifecycle cleanup, Vite produces a small static build, and break_infinity.js handles resource/power arithmetic. Numbers in serialized JSON use strings rather than native floating-point limits.

```bash
npm run check
npm test
npm run build
```

The tests cover the opening summon, unlock gates, parallel summoning, paid automation and pause, prestige resets and production bonuses, huge-number save round trips, corrupted saves/storage errors, formatting, campaign advancement/completion, old-save migration, and first-city balance with and without Dominion.

## Known limitations

Six cities are playable in sequence. This is a fictional ancient-world/Silk Road campaign, not a historical timeline; additional regions remain future content. Combat is deterministic. Background/offline production, cloud saves, multiple simultaneous tabs sharing one save, mobile-specific tuning, and dimensional gameplay are not implemented. Browser UI was smoke-tested in Chromium; Firefox-specific testing remains outstanding. Balance is provisional and strategy-dependent.

## Roadmap

- **v0.0.2:** player feedback, balance, hierarchy and unlock tree, cultural differences.
- **v0.0.3:** expanded cities, regional conquest, Slavic tradition, deeper prestige.
- **Later:** countries, continents, Earth conquest/destruction, dimensions, and new traditions.






Research migration: older saves default spent Knowledge to zero and retain their owned upgrades, including seals whose prerequisites have changed. Existing units remain usable. New balance prices and discovery requirements apply immediately; this is a balance revision, not a save reset.

## Slavic region

Conquering Alexandria opens **Slavic** and continues directly to **Nitra → Velehrad → Praha → Kraków → Kyiv → Novgorod**. These are fictional game encounters; defenses rise from 30 million to 7.2 billion, with Dominion rewards of 65 / 85 / 110 / 140 / 180 / 230. The usual conquest reset applies, while Dominion and region access remain. Only Novgorod completes the expanded campaign.

The original units remain available. Six additional orders unlock in Slavic through discovered Knowledge:

| Entity | Knowledge | Base Essence cost | Base power |
|---|---:|---:|---:|
| Bludička | 1,200 | 250,000 | 30,000 |
| Rusalka | 4,000 | 1,000,000 | 120,000 |
| Upír | 12,000 | 4,000,000 | 500,000 |
| Striga | 30,000 | 16,000,000 | 2,000,000 |
| Lešij | 75,000 | 60,000,000 | 8,000,000 |
| Čert | 180,000 | 250,000,000 | 35,000,000 |

Bludička, Rusalka, Striga, and Lešij also generate Knowledge. Fanatic Training levels 7–12 automate the new units once their Knowledge requirements are met and a Fanatic is present. Demon-specific bonuses remain limited to tiers IV–VI; Slavic entities benefit from their own power research and general army bonuses.

Seven region-gated seals extend existing tree branches: Book of Veles, Knot of the Three Worlds, Circle of the Grove, Midsummer Bonfire, Perun’s Thunder, Offering to the Old Gods, and Ancestral Covenant. Their effects cover Knowledge, summoning speed/cost, Essence, general/Slavic power, and Followers. They still consume both Knowledge and Essence and reset on conquest.

Existing completed Alexandria saves (city index 6) automatically resume at Nitra without replaying Alexandria or granting its reward twice. Missing new unit fields initialize to zero. The first-city balance benchmark remains within 15–25 minutes; later regional pacing has not been calibrated to the first-city timing target.

Training save migration: old Circle I becomes level 1. Old Circle II becomes level 6 in Ancient Empires or level 12 in Slavic. Stored training levels survive reload and reset with conquest. Training is one tree node throughout, with its current rank, next entity, and next price shown in its detail panel.
