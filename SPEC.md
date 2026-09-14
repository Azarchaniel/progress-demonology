# Progress Demonology — v0.0.1 Specification

> **Fanatic Training revision (2026-09-14):** One repeatable Fanatic Training node replaces Summoning Circle I/II. Rank N authorizes Fanatics to automate the first N entities in the existing order, starting with Lesser Spirit, Imp, Familiar. Price starts at 180 Essence + 18 Knowledge and grows ×3/×2 per rank. Ranks 7–12 require Slavic. A Fanatic is still required; its count sets speed/capacity, not entity eligibility. Manual summoning is unchanged. Legacy circles migrate to ranks 1 or 6/12. Training resets on conquest. The tree now has 41 nodes; the active first-city benchmark is 19:47.


> **Slavic expansion (2026-09-14):** Alexandria now opens the Slavic region instead of completing the campaign. Its six cities are Nitra, Velehrad, Praha, Kraków, Kyiv, and Novgorod. Six additional entities—Bludička, Rusalka, Upír, Striga, Lešij, Čert—and seven extensions to the existing research branches unlock only after Alexandria. Original entities stay available. Temporary progress still resets after every city; region access and Dominion persist. The campaign now ends after twelve cities. Old completed Alexandria saves continue at Nitra. This supersedes earlier statements that Slavic is a future chronicle and that Alexandria ends the game.


> **Research and pacing revision (2026-09-14):** The first conquest now targets 15–25 minutes. This supersedes earlier 5–15 minute and non-spending Knowledge rules below. Research consumes both Essence and Knowledge; current Knowledge plus research spending tracks discoveries for the run, so spending never relocks discovered entities or books. Rituals are a 35-node, seven-branch 2D map with dependency edges, drag/swipe panning, wheel and button zoom, fit/reset controls, and a selected-node purchase panel. Late research reaches 35,000 Knowledge and books extend to 22,000 discovered Knowledge. Summon cost growth is 1.045; demon knowledge gates are 300/1,800/6,000. City defenses are 60,000 → 180,000 → 500,000 → 1.5M → 4M → 12M. Existing upgrades survive migration; research and discoveries still reset on conquest. The active-play benchmark reaches Babylon at 20:21.


> **Current development direction (2026-09-09):** The user has revised the visual and campaign scope below. Use a pure black (#000000) background and white (#FFFFFF) lettering, with prominent ancient-inspired graphical ornaments, winged seals, stepped gates, and monumental framing, with no gray, translucent colors, gradients, blur, or shaded shadows. Suggest scorched margins and ripped parchment with solid ink marks and jagged silhouettes. Replace the Olomouc/European city route with Babylon → Nineveh → Persepolis → Samarkand → Baghdad → Alexandria. All six cities are playable sequentially: a victory awards the city's Dominion, resets temporary progress, and advances automatically to the next city. The final victory completes this campaign. Existing saves retain earned Dominion and begin the new route at Babylon. Summoning now has one shared active circle by default, including automation. After the first completed summon, recruit 1 Follower every 30 seconds, accelerated by Dominion. Initiate 1 Follower into 1 Fanatic for 100 Essence at 10 Knowledge (a requirement, not a cost). Each Fanatic adds 10% summoning speed; each 3 adds a concurrent circle up to 6. Followers/Fanatics reset on conquest. Preserve older paid summons in order when capacity is exceeded. Keep I. The Reservoir visible in a persistent desktop sidebar. The remaining main workspace is tab content: II. The Summoning, III. Rituals & Seals, IV. Conquest, and V. Empires. Simulation continues across tabs. These revisions supersede the original palette and first-city-only restrictions; future regions, tradition mechanics, and dimensions remain outside scope.


## 1. Project Overview

- **Genre:** incremental / idle / progression game
- **Target:** desktop web browser; distribution target: itch.io
- **Goal:** a visually convincing, playable prototype establishing the core UI, progression loop, atmosphere, and extensible technical architecture.
- **Tone:** an occult manuscript gradually becoming a war machine.

The prototype is not intended to be a fully balanced game. A fresh run should demonstrate the complete loop in approximately **5–15 minutes**.

## 2. Core Fantasy and Long-Term Arc

The player is an occult summoner building an army of supernatural entities. Historical mythology and folklore are the primary source material. Planned traditions include Christian/European demonology, Sumerian/Mesopotamian, Assyrian/Babylonian, and Slavic folklore.

Long-term progression:

```text
Cities → Regions → Countries → Continents → Earth → Destroy Earth → Dimensions
```

The prototype should visibly tease future cities, traditions, Earth conquest, and dimensional ascension without implementing those later systems.

## 3. Design Principles

- Start with modest numbers and slow progress; later scale to enormous armies and territories.
- Keep the interface calm even when numbers become absurd.
- Primary feedback: progress bars, numbers, and newly unlocked systems.
- Avoid excessive particles, flashing, screen shake, visual noise, and arcade-style animation.
- Prefer a deliberate, ominous, manuscript-like presentation.

## 4. Technical Requirements

Use a lightweight HTML/CSS/JavaScript or TypeScript implementation. Frameworks are optional but should be justified.

- Desktop-first; support current Chromium and Firefox.
- Separate simulation from rendering; keep game state serializable.
- Use one central loop with delta-time simulation, not one timer per unit.
- Use `requestAnimationFrame` where appropriate and batch/throttle DOM updates.
- Simulation may run at roughly 60 Hz; numeric UI updates at roughly 10–20 Hz.
- Efficiently support dozens or eventually hundreds of simultaneous progress bars.
- Keep CPU usage low.
- Save automatically using `localStorage`; support reload persistence, manual save if useful, reset save, timestamps, versioning, and future offline-progress support.
- Autosave approximately every 10–30 seconds and on page close where practical.

## 5. Visual Direction

The interface should resemble an old occult manuscript or grimoire.

- Palette: black, off-white, parchment, subtle grey, and restrained dark-red accents.
- Use a subtle, readable parchment texture, preferably CSS-generated or lightweight.
- Panels may use thin ornamental borders, engraved lines, corner ornaments, occult geometry, and manuscript separators.
- Use a decorative serif/display face for headings, city names, rituals, and section titles; use a highly readable serif for numbers, descriptions, buttons, and statistics.
- Avoid colorful modern dashboard styling and heavy boxed layouts.

## 6. Main Layout

The central army/progression area gets the most space:

```text
┌──────────────────────────────────────────────────────────────┐
│ PROGRESS DEMONOLOGY                         v0.0.1           │
│ Current City / Campaign                                      │
├───────────────┬─────────────────────────────┬────────────────┤
│ RESOURCES     │ SUMMONING / ARMY            │ RITUALS        │
│ Essence       │ Unit progress bars          │ Pentagram      │
│ Knowledge     │ Lesser Spirit, Imp, ...     │ Candles        │
│ Power         │                             │ Incense        │
├───────────────┴─────────────────────────────┴────────────────┤
│ CONQUEST — city strength, army strength, action              │
├──────────────────────────────────────────────────────────────┤
│ WORLD / FUTURE PROGRESSION                                   │
└──────────────────────────────────────────────────────────────┘
```

## 7. Resources

### Essence

Primary supernatural resource. Generated continuously and spent on units, rituals, and upgrades.

```text
Essence
1,284
+14.2 / sec
```

### Knowledge

Secondary occult progression resource. Grows more slowly than Essence and unlocks rituals, better summoning, and stronger entities.

### Army Power

Derived statistic calculated from owned units and modifiers. It is primarily used for conquest.

## 8. Units and Summoning

Every entity needs: `id`, name, tier, owned amount, base power, total power, summon cost, summon duration, production contribution, and unlock requirement. Keep definitions in centralized data/config structures; do not hardcode game logic into UI elements.

Initial hierarchy (placeholder values, easy to rebalance):

| Tier | Entity | Power | Role |
|---:|---|---:|---|
| I | Lesser Spirit | 1 | Cheap, fast, first summon, small Essence generation |
| II | Imp | 5 | Stronger basic servant |
| III | Familiar | 25 | Production bonuses |
| IV | Lesser Demon | 150 | First meaningful military entity |
| V | Demon | 1,000 | Expensive and substantially stronger |
| VI | Greater Demon | 8,000 | Late-game unit for the first city |

Example definition:

```js
{
  id: "lesser_spirit",
  name: "Lesser Spirit",
  tier: 1,
  owned: 12,
  basePower: 1,
  baseCost: 10,
  summonTime: 2.5
}
```

Each summonable entity has a smooth but restrained progress bar showing completion percentage, production interval, and power. Multiple bars must run simultaneously.

## 9. Automation

Early gameplay may require manually starting processes, but upgrades must transition the player toward automation quickly. Example: **Summoning Circle I — Automatically summons Lesser Spirits.** The player must not need to click thousands of times.

## 10. Rituals and Upgrades

Implement at least a few upgrades in each category:

- **Pentagram:** summoning speed, e.g. +10%, +25%.
- **Sacred Geometry:** reduced cost, increased unit power, and production multipliers.
- **Candles:** speed and passive generation, e.g. Essence generation +20%.
- **Incense:** supernatural production and stronger entities, e.g. Demon power +15%.

The priority is establishing the system and visual presentation, not perfect balancing.

## 11. Number Formatting

Centralize formatting and support both early and large values:

```text
1       12       1,420       48,200       1.25 M       48.3 B       7.14 T
```

Do not scatter formatting logic through UI components. The architecture must allow much larger notation later.

## 12. Conquest and Prestige

The first playable city is **Olomouc**. Show a city name, defensive strength, player Army Power, victory chance, and a conquest action. Combat may be extremely simple and need not be tactical.

Campaign preview:

```text
Olomouc → Brno → Prague → Vienna → Rome → ???
```

Successful conquest is a small prestige reset:

- current army is destroyed;
- temporary resources/upgrades reset;
- permanent **Dominion** is awarded;
- Dominion survives and accelerates later runs.

Example formula:

```text
Global production multiplier = 1 + Dominion * 0.05
```

The second run must be noticeably faster. Display the army loss, Dominion gained, and permanent bonus.

## 13. Traditions, World, and Dimensions

Display the active European tradition and locked future traditions, for example:

```text
European Demonology  ACTIVE
Slavic                LOCKED — Requires: Conquer Prague
Sumerian              LOCKED — Requires: Reach Mesopotamia
Assyrian              LOCKED
```

Show a locked dimensional teaser such as **Earth → The Abyss → Astral Realm**. Do not implement dimensional gameplay in v0.0.1.

## 14. First-Run Experience

Initially activate only a limited portion of the manuscript. Reveal systems progressively. The opening should communicate the first summoning without overwhelming the player:

```text
THE FIRST SUMMONING
Essence slowly gathers around the circle.
Essence: 7 / 10
██████████████░░░░░░
[ SUMMON LESSER SPIRIT ]
```

Suggested timing targets: Essence starts immediately; first Spirit around 0:15; Imp around 1:30; first automation around 3:30; Lesser Demon around 5:00; first conquest around 10:00–15:00.

## 15. Save System and Debugging

Persist at least:

```js
{
  version: "0.0.1",
  resources: {}, units: {}, upgrades: {}, conquest: {}, meta: {}, lastSave: 0
}
```

Provide a confirmed **Reset Save** action. Add a small collapsible, visually separated debug panel with: `+1,000 Essence`, `+100 Knowledge`, `+10 Dominion`, `10x simulation speed`, unlock all units, and reset save.

## 16. Architecture

Prefer a structure such as:

```text
progress-demonology/
├── index.html
├── README.md
├── css/game.css
├── js/{game,state,units,upgrades,conquest,save,formatting,ui}.js
└── assets/{ornaments,textures}/
```

Exact structure may differ if justified. Do not put the entire prototype in one enormous HTML file. Content should be data-driven.

## 17. Must Implement in v0.0.1

- Functional browser game with visible `v0.0.1` identifier.
- Parchment/grimoire visual identity and desktop layout.
- Essence, Knowledge, Army Power, costs, scaling, and centralized number formatting.
- At least five units with unlocks and simultaneous progress bars.
- Basic automation.
- Pentagram, Geometry, Candle, and Incense upgrades.
- First playable city, strength, conquest, reset, Dominion bonus, and faster second run.
- Future cities, locked traditions, and dimensional progression teaser.
- `localStorage` persistence, autosave, reset save, and debug panel.

## 18. Do Not Implement Yet

Avoid significant work on complex combat, animated demon characters, multiplayer, backend/accounts/cloud saves, monetization, mobile optimization, sound, achievements, hundreds of units, a full world map, complete mythology research, full Earth conquest, or actual dimensional gameplay.

## 19. Acceptance Criteria

The prototype succeeds when it launches from `index.html` or a minimal local server, immediately communicates the occult/incremental/supernatural concept, increases numbers automatically, unlocks at least five entities, runs multiple progress bars smoothly, makes rituals meaningful, increases Army Power, allows the first city to be conquered, resets army/progress while preserving Dominion, makes the next run faster, persists after reload, supports save reset and debug controls, visibly teases future content, and keeps core values centralized for rebalancing.

## 20. README Requirements

Create `README.md` with project name, version, description, run instructions, structure, save explanation, debug controls, architecture, known limitations, and roadmap. Preferred launch command:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`. Mention direct `index.html` support if it works.

## 21. Roadmap

- **v0.0.1:** playable visual prototype.
- **v0.0.2:** feedback, balance, proper hierarchy, unlock tree, first cultural differences.
- **v0.0.3:** multiple cities, regional conquest, Slavic tradition, deeper prestige.
- **Later:** countries, continents, Earth, world destruction, dimensional ascension, and new progression trees.

## Implementation Directive

Implement this specification as v0.0.1. Create the complete runnable project, then test the core gameplay loop and fix obvious UI/runtime errors. Prioritize visual identity, playable progression, satisfying progress bars, clear scaling, the city prestige loop, clean extensible architecture, and performance. The prototype should feel like the beginning of a real game—not an admin dashboard or a collection of placeholder buttons.





