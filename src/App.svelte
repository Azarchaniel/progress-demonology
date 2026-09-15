<script lang="ts">
  import { onMount } from "svelte";
  import Decimal from "break_infinity.js";
  import packageJson from "../package.json";
  import { cities, units, rules, cultRules, knowledgeSources, regions } from "./lib/content";
  import UpgradeTree from "./lib/UpgradeTree.svelte";
  import PentagramBoard from "./lib/PentagramBoard.svelte";
  import PixelProgressBar from "./lib/PixelProgressBar.svelte";
  import {
    summonCapacity,
    activeSummons,
    runningSummons,
    fanaticSpeed,
    followerInterval,
    canPromote,
    promoteFanatic,
    fanaticPromotionCost,
    followerGate,
  } from "./lib/cult";
  import { formatNumber as fmt, formatRate, formatTime } from "./lib/format";
  import {
    loadState,
    loadNotice,
    saveState,
    createInitialState,
    discoveredKnowledge,
    regionUnlocked,
    currentRegion,
  } from "./lib/state";
  import {
    armyPower,
    essenceRate,
    knowledgeRate,
    isUnlocked,
    tick,
    summon,
    buyUpgrade,
    conquer,
    hasUpgrade,
    multiplier,
    dominionMultiplier,
    summonCost,
    summonDuration,
    unitPower,
    isAutomated,
    upgradeLevel,
    currentCity,
    campaignComplete,
    drawPentagram,
    pentagramReward,
  } from "./lib/simulation";

  let state = loadState();
  const tabs = [
    { id: "summoning", numeral: "II", label: "The Summoning" },
    { id: "rituals", numeral: "III", label: "Rituals & Seals" },
    { id: "conquest", numeral: "IV", label: "Conquest" },
    { id: "empires", numeral: "V", label: "Empires" },
  ];
  $: availableTabs = tabs.filter(
    (tab) => tab.id !== "empires" || state.conquest.victories > 0,
  );
  let activeTab = "summoning";
  function selectTab(id: string) {
    activeTab = id;
    if (id !== "conquest") conquestOpen = false;
  }
  function navigateTabs(event: KeyboardEvent, index: number) {
    let target = index;
    if (event.key === "ArrowRight") target = (index + 1) % availableTabs.length;
    else if (event.key === "ArrowLeft")
      target = (index + availableTabs.length - 1) % availableTabs.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = availableTabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(availableTabs[target].id);
    document.getElementById("tab-" + availableTabs[target].id)?.focus();
  }
  let notice = loadNotice;
  let resetOpen = false;
  let conquestOpen = false;
  let saveError = false;
  $: power = armyPower(state);
  $: automaticSummoning = units.some(
    (u) =>
      state.active[u.id] &&
      isAutomated(state, u.id) &&
      !state.automationPaused[u.id],
  );
  $: manualSummoning = units.some(
    (u) =>
      state.active[u.id] &&
      (!isAutomated(state, u.id) || state.automationPaused[u.id]),
  );
  $: nextKnowledgeIndex = knowledgeSources.findIndex((source) =>
    discoveredKnowledge(state).lt(source.requirement),
  );
  $: city = currentCity(state);
  $: complete = campaignComplete(state);
  $: region = currentRegion(state);
  $: regionalCities = cities.filter(c => c.region === region.id);
  $: regionalUnitCount = units.filter(u => regionUnlocked(state, u.region)).length;
  $: nextCity = cities[state.campaign.cityIndex + 1];
  $: readiness = city
    ? Math.min(100, power.div(city.strength).times(100).toNumber())
    : 100;
  $: firstSummoning =
    units.every((unit) => state.units[unit.id].eq(0)) &&
    state.conquest.victories === 0;
  $: ritualsOpen = discoveredKnowledge(state).gte(8) || state.conquest.victories > 0;
  $: conquestVisible = discoveredKnowledge(state).gte(35) || state.conquest.victories > 0;
  $: nextUnit = units.find((u, index) => regionUnlocked(state, u.region) && !isUnlocked(state, index));
  $: capacity = summonCapacity(state);
  $: occupied = activeSummons(state);
  $: running = runningSummons(state);

  function save(manual = false) {
    saveError = !saveState(state);
    if (manual)
      notice = saveError
        ? "Save failed. Browser storage may be full or disabled."
        : "Your manuscript has been saved.";
    state = state;
  }
  onMount(() => {
    let previous = performance.now(),
      uiElapsed = 0,
      saveElapsed = 0,
      frame = 0;
    const loop = (now: number) => {
      const delta = Math.max(0, (now - previous) / 1000);
      previous = now;
      if (!document.hidden) {
        tick(state, delta);
        uiElapsed += delta;
        if (uiElapsed >= 0.08) {
          state = state;
          uiElapsed = 0;
        }
      }
      saveElapsed += delta;
      if (saveElapsed >= rules.autosaveSeconds) {
        save();
        saveElapsed = 0;
      }
      frame = requestAnimationFrame(loop);
    };
    const visibility = () => {
      previous = performance.now();
      if (document.hidden) save();
    };
    const pagehide = () => save();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
      save();
    };
  });
  function action(fn: () => boolean) {
    fn();
    state = state;
  }
  function pause(id: string) {
    state.automationPaused[id] = !state.automationPaused[id];
    state = state;
  }
  function pauseAll() {
    for (const unit of units) state.automationPaused[unit.id] = true;
    state = state;
  }
  function debug(kind: string) {
    if (kind === "essence") state.essence = state.essence.plus(1000);
    if (kind === "knowledge") state.knowledge = state.knowledge.plus(100);
    if (kind === "dominion") state.dominion = state.dominion.plus(10);
    if (kind === "speed")
      state.simulationSpeed = state.simulationSpeed === 1 ? 10 : 1;
    if (kind === "unlock") state.debugUnlock = true;
    state = state;
  }
  function reset() {
    state = createInitialState();
    activeTab = "summoning";
    resetOpen = false;
    conquestOpen = false;
    notice = "A blank manuscript. The first circle awaits.";
    save();
  }
  function prestige() {
    const fallen = city?.name;
    if (conquer(state)) {
      conquestOpen = false;
      notice =
        fallen +
        " has fallen. " +
        (currentCity(state)
          ? "The march continues to " + currentCity(state).name + "."
          : "Both regions are conquered.");
      if (fallen === "Alexandria") notice = "Alexandria has fallen. Slavic unlocked: six new cities, six new entities, and seven new research seals. The march continues to Nitra.";
      save();
    }
  }
</script>

<svelte:head
  ><meta
    name="description"
    content="An incremental grimoire. Bind spirits, inscribe rituals, and sacrifice an army for permanent Dominion."
  /></svelte:head
>
<div class="page-shell">
  <header class="masthead">
    <div>
      <svg class="ancient-emblem" viewBox="0 0 440 100" aria-hidden="true">
        <circle cx="220" cy="43" r="29" /><circle cx="220" cy="43" r="21" />
        <path
          class="solid"
          d="M220 17 225 35 242 25 231 42 246 47 229 51 236 68 220 57 204 68 211 51 194 47 209 42 198 25 215 35Z"
        />
        <path
          d="M189 32 18 14 47 36 184 46M183 48 43 39 67 57 188 57M191 61 70 61 94 76 200 69M251 32 422 14 393 36 256 46M257 48 397 39 373 57 252 57M249 61 370 61 346 76 240 69M210 73 196 92 220 85 244 92 230 73"
        />
        <path
          d="M49 21 66 38M75 24 91 40M102 27 117 42M129 29 143 43M155 31 166 45M391 21 374 38M365 24 349 40M338 27 323 42M311 29 297 43M285 31 274 45M220 2V9M176 9 184 17M264 9 256 17"
        />
      </svg>
      <h1>Progress Demonology</h1>
      <p class="subtitle">From the ashes of one empire, another shall rise.</p>
    </div>
    <div class="edition">VOL. I<span>v{packageJson.version}</span></div>
  </header>
  <main style="position: relative">
    <p class="eyebrow-absolute">REGION · {region.name} · {complete ? "CONQUERED" : `CITY ${state.campaign.cityIndex - region.startIndex + 1} / ${regionalCities.length}`}</p>
    <section class="campaign">
      <span class="eyebrow"
        >{complete
          ? "CHRONICLE COMPLETE"
          : "CITY " +
            (state.campaign.cityIndex + 1) +
            " / " +
            cities.length}</span
      ><strong>{city?.name ?? "The ancient world has fallen"}</strong><span
        class="campaign-note">{city?.epithet ?? "Your Dominion endures"}</span
      ><span class="dominion"
        >Dominion <b>{fmt(state.dominion)}</b><small
          >×{fmt(dominionMultiplier(state), 2)} production</small
        ></span
      >
    </section>
    {#if notice}<div class="notice" role="status">
        <span>{notice}</span><button
          class="text-button"
          aria-label="Dismiss notification"
          on:click={() => (notice = "")}>×</button
        >
      </div>{/if}
    {#if state.conquest.last}<section class="victory-record">
        <span class="eyebrow"
          >{state.conquest.last.cityName} HAS FALLEN · VICTORY {state.conquest
            .victories}</span
        >
        <p>
          {fmt(state.conquest.last.armyLost)} entities sacrificed.
          <strong>+{fmt(state.conquest.last.dominionGained)} Dominion</strong>
          retained forever. Your production is now
          <strong>×{fmt(dominionMultiplier(state), 2)}</strong>.
        </p>
        <small
          >Army, Followers, Fanatics, resources, rituals, and summoning circles
          were reset. {city
            ? "Rebuild your army. " + city.name + " awaits."
            : "All twelve cities have fallen. This chronicle is complete."}</small
        >
      </section>{/if}
    <div class="layout">
      <aside class="resources">
        <h2><span>I</span> The Reservoir</h2>
        <div class="resource">
          <span>Essence</span><strong>{fmt(state.essence, 1)}</strong><small
            >{formatRate(essenceRate(state))}</small
          >
        </div>
        <div class="resource">
          <span>Knowledge</span><strong>{fmt(state.knowledge, 1)}</strong><small
            >{formatRate(knowledgeRate(state))}</small
          >
          <small>{fmt(discoveredKnowledge(state), 1)} discovered this run</small>
        </div>
        <div class="resource">
          <span>Army Power</span><strong>{fmt(power)}</strong><small
            >The strength of all bound entities</small
          >
        </div>
        <section class="cult-panel" aria-label="Followers and Fanatics">
          <h2>The Faithful</h2>
          <svg class="cult-seal" viewBox="0 0 150 65" aria-hidden="true"
            ><path
              d="M55 59V38L75 6 95 38V59ZM10 59V43L28 17 46 43V59M104 59V43L122 17 140 43V59M62 35H88M17 40H39M111 40H133M75 45V58M68 52H82"
            /></svg
          >
          <div class="cult-counts">
            <div>
              <span>Followers</span><strong>{fmt(state.cult.followers)}</strong>
            </div>
            <div>
              <span>Fanatics</span><strong>{fmt(state.cult.fanatics)}</strong>
            </div>
          </div>
          {#if followerGate(state)}
            <p>
              Word of your power spreads. One Follower arrives every {fmt(
                followerInterval(state),
                1,
              )} sec.
            </p>
            <PixelProgressBar
              label="Next Follower"
              value={Math.min(100, (state.cult.progress / followerInterval(state)) * 100)}
            />
            <small
              >Next arrival in {fmt(
                Math.max(0, followerInterval(state) - state.cult.progress),
                1,
              )} sec</small
            >
          {:else}<p>
              Reach Lesser Demon to attract Followers. Their faith will become
              your strength.
            </p>{/if}
          <button
            class="promote-button"
            disabled={!canPromote(state)}
            on:click={() => action(() => promoteFanatic(state))}
            >Initiate a Fanatic</button
          >
          <small
            >Costs {cultRules.followersPerFanatic} Follower + {fmt(
              fanaticPromotionCost(state),
            )}
            Essence.<br />Requires {cultRules.promotionKnowledge} Knowledge (not
            spent).</small
          >
          <p>
            Each Fanatic: +{cultRules.speedPerFanatic * 100}% summoning speed.<br
            />Every {cultRules.fanaticsPerCircle} Fanatics: +1 simultaneous circle,
            up to 6.
          </p>
          <small
            >Current aid: ×{fmt(fanaticSpeed(state), 2)} speed · {capacity}
            {capacity === 1 ? "circle" : "circles"}.<br />Followers and Fanatics
            reset after conquest.</small
          >
        </section>
        <div class="sigil" aria-hidden="true">
          <svg viewBox="0 0 200 200"
            ><circle cx="100" cy="100" r="82" /><circle
              cx="100"
              cy="100"
              r="72"
            /><path d="M100 25 144 162 29 77 171 77 56 162Z" /><circle
              cx="100"
              cy="100"
              r="22"
            /></svg
          >
        </div>
        <p class="marginalia">
          “What is called forth<br />cannot be forgotten.”
        </p>
        <div class="run-clock">
          <span>Time in this invocation</span><b>{formatTime(state.runTime)}</b>
        </div>
        {#if state.simulationSpeed === 10}<p class="debug-badge">
            DEBUG · 10× TIME
          </p>{/if}
      </aside>
      <div class="workspace-content">
        <div
          class="manuscript-tabs"
          role="tablist"
          aria-label="Manuscript chapters"
        >
          {#each availableTabs as tab, index}
            <button
              id={"tab-" + tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={"panel-" + tab.id}
              tabindex={activeTab === tab.id ? 0 : -1}
              on:click={() => selectTab(tab.id)}
              on:keydown={(event) => navigateTabs(event, index)}
              ><span>{tab.numeral}</span>{tab.label}</button
            >
          {/each}
        </div>
        <div
          class="chapter-panel"
          id="panel-summoning"
          role="tabpanel"
          aria-labelledby="tab-summoning"
          tabindex="0"
          hidden={activeTab !== "summoning"}
        >
          <section class="army">
            <h2><span>II</span> The Summoning</h2>
            <details class="pentagram-drawing" open>
              <summary>Draw the Pentagram</summary>
              <p>Trace the seal to gather raw Essence and Knowledge.</p>
              <PentagramBoard
                on:complete={() =>
                  action(() => {
                    drawPentagram(state);
                    return true;
                  })}
              />
              <small
                >Trace the heavy grey outline in one stroke · +{fmt(pentagramReward(state).essence, 2)} Essence · +{fmt(pentagramReward(state).knowledge, 2)}
                Knowledge</small
              >
            </details>
            {#if firstSummoning}
              <div class="opening">
                <p class="eyebrow">THE FIRST SUMMONING</p>
                <h3>Something stirs in the circle.</h3>
                <p>
                  Draw the pentagram to gather Essence. Bind a Lesser Spirit for 10
                  Essence; each spirit gathers more. Knowledge slowly reveals
                  the next names.
                </p>
                <PixelProgressBar
                  label="First summoning Essence"
                  value={Math.min(100, state.essence.div(10).times(100).toNumber())}
                />
                <small
                  >{fmt(Decimal.min(state.essence, 10), 1)} / 10 Essence · use the
                  summon button below</small
                >
              </div>
            {/if}
            {#each units as unit, index}
              {#if isUnlocked(state, index)}
                <article class="unit">
                  <div class="unit-head">
                    <div>
                      <span class="tier"
                        >{["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][index]}</span
                      >
                      <h3>{unit.name}</h3>{#if unit.region}<small>Slavic</small>{/if}
                    </div>
                    <span class="owned"
                      ><b>{fmt(state.units[unit.id])}</b> bound</span
                    >
                  </div>
                  <p class="unit-description">{unit.description}</p>
                  <small>{upgradeLevel(state, "circle") > index ? "Fanatics trained to summon this entity" : `Automatic summoning requires Fanatic Training level ${index + 1}`}</small>
                  <div class="progress-label">
                    <span
                      >{state.active[unit.id]
                        ? running.includes(unit.id)
                          ? "Binding in progress"
                          : "Paid · waiting for a circle"
                        : occupied >= capacity
                          ? "All circles occupied"
                          : isAutomated(state, unit.id) &&
                              !state.automationPaused[unit.id]
                            ? "Circle awaits essence"
                            : "Circle at rest"}</span
                    ><span
                      >{state.active[unit.id]
                        ? Math.min(
                            100,
                            Math.floor(
                              (state.progress[unit.id] /
                                summonDuration(state, unit)) *
                                100,
                            ),
                          ) + "% · "
                        : ""}{fmt(summonDuration(state, unit), 1)} sec</span
                    >
                  </div>
                  <PixelProgressBar
                    label={unit.name + " summoning"}
                    value={Math.min(100, (state.progress[unit.id] / summonDuration(state, unit)) * 100)}
                  />
                  <div class="unit-meta">
                    <span
                      >{fmt(unitPower(state, unit))} power each ·
                      <b
                        >{fmt(
                          state.units[unit.id].times(unitPower(state, unit)),
                        )}</b
                      >
                      total<br />+{fmt(
                        unit.essencePerSecond.times(
                          multiplier(state, "essence"),
                        ),
                        2,
                      )} Essence/sec each{#if unit.knowledgePerSecond}<br />+{fmt(multiplier(state, "knowledge").times(unit.knowledgePerSecond), 2)} Knowledge/sec each{/if}</span
                    ><button
                      disabled={state.active[unit.id] ||
                        manualSummoning ||
                        (!!state.knowledgeSource &&
                          !isAutomated(state, unit.id)) ||
                        occupied >= capacity ||
                        state.essence.lt(summonCost(state, unit))}
                      on:click={() => action(() => summon(state, unit.id))}
                      >{state.active[unit.id]
                        ? running.includes(unit.id)
                          ? "Binding · " + fmt(summonCost(state, unit), 1)
                          : "Queued · " + fmt(summonCost(state, unit), 1)
                        : occupied >= capacity
                          ? "Circle occupied · " +
                            fmt(summonCost(state, unit), 1)
                          : "Summon · " +
                            fmt(summonCost(state, unit), 1)}</button
                    >
                  </div>
                  {#if isAutomated(state, unit.id)}<button
                      class="text-button auto-toggle"
                      aria-pressed={!state.automationPaused[unit.id]}
                      on:click={() => pause(unit.id)}
                      >↻ Auto {state.automationPaused[unit.id]
                        ? "paused · Resume"
                        : "active · Pause"}</button
                    >{/if}
                </article>
              {/if}
            {/each}
            {#if !regionUnlocked(state, "slavic")}<p class="section-note">Conquer Alexandria to open Slavic: Will-o'-the-wisp, Water nymph, Vampire, Striga, Leshij, and Chort.</p>{/if}
            {#if nextUnit}<div class="locked-unit">
                <span class="eyebrow">THE NEXT NAME IS SEALED</span>
                <h3>{nextUnit.name}</h3>
                <p>
                  Requires {fmt(nextUnit.unlockKnowledge)} Knowledge · {fmt(
                    discoveredKnowledge(state),
                    1,
                  )} gathered
                </p>
                <small>{regionalUnitCount} orders of entities are available in this region.</small
                >
              </div>{/if}
          </section>
          <div class="summon-capacity">
            <strong>{running.length} / {capacity} circles occupied</strong>
            <p>
              {capacity === 1
                ? "You can conduct only one summoning at a time. Fanatics can help you open more circles."
                : "Your Fanatics help you conduct multiple summonings."}
            </p>
            {#if occupied > capacity}<small
                >Previously paid summons wait for a free circle; their progress
                is preserved.</small
              >{/if}{#if hasUpgrade(state, "circle")}<button
                class="text-button"
                on:click={pauseAll}>Pause all automatic circles</button
              >{/if}
          </div>
          <section class="knowledge-sources">
            <h3>Knowledge Sources</h3>
            <p>One source may be active at a time.</p>
            {#each knowledgeSources as source, index}{#if index === 0 || discoveredKnowledge(state).gte(source.requirement)}<article
                  class="unit"
                >
                  <div class="unit-head">
                    <h3>{source.title}</h3>
                    <span class="owned">+{fmt(multiplier(state, "knowledge").times(source.value), 2)} / sec</span>
                  </div>
                  <p class="unit-description">{source.description}</p>
                  <PixelProgressBar
                    full={state.knowledgeSource === source.id}
                    label={source.title + " study"}
                    value={state.knowledgeSource === source.id ? 100 : 0}
                  />
                  <div class="unit-meta">
                    <span>Requires {fmt(source.requirement)} discovered Knowledge</span><button
                      disabled={discoveredKnowledge(state).lt(source.requirement) ||
                        manualSummoning}
                      on:click={() =>
                        action(() => {
                          state.knowledgeSource =
                            state.knowledgeSource === String(source.id)
                              ? null
                              : String(source.id);
                          return true;
                        })}
                      >{state.knowledgeSource === source.id
                        ? "Active · Deactivate"
                        : "Study"}</button
                    >
                  </div>
                </article>{:else if index === nextKnowledgeIndex}<article
                  class="unit locked"
                >
                  <div class="unit-head">
                    <h3>{source.title}</h3>
                    <span class="owned"></span>
                  </div>
                  <p class="unit-description">{source.description}</p>
                  <div class="unit-meta">
                    <span>Requires {fmt(source.requirement)} discovered Knowledge</span>
                  </div>
                </article>{/if}{/each}
          </section>
        </div>
        <div
          class="chapter-panel"
          id="panel-rituals"
          role="tabpanel"
          aria-labelledby="tab-rituals"
          tabindex="0"
          hidden={activeTab !== "rituals"}
        >
          <section class="rituals">
            <h2><span>III</span> Rituals & Seals</h2>
            {#if ritualsOpen}
              <p class="section-note">
                Research spends Essence and Knowledge.
                Drag the map to explore; use the wheel or buttons to zoom.
                Double click for quick buy.
              </p>
              <UpgradeTree {state} on:buy={(event) => action(() => buyUpgrade(state, event.detail))} />
            {:else}<div class="sealed">
                <span aria-hidden="true">✧</span>
                <h3>The ink is silent.</h3>
                <p>
                  Gather 8 Knowledge to reveal rituals, production blessings,
                  and automatic summoning circles.
                </p>
                <small>{fmt(state.knowledge, 1)} / 8 Knowledge</small>
              </div>{/if}
          </section>
        </div>
        <div
          class="chapter-panel"
          id="panel-conquest"
          role="tabpanel"
          aria-labelledby="tab-conquest"
          tabindex="0"
          hidden={activeTab !== "conquest"}
        >
          <section class="conquest">
            <div class="section-heading">
              <h2><span>IV</span> Conquest</h2>
              <span class="eyebrow">AN ARMY FOR AN EMPIRE</span>
            </div>
            {#if complete}
              <div class="campaign-ending">
                <p class="eyebrow">THE LAST GATE HAS OPENED</p>
                <h3>Twelve cities. Two regions. One Dominion.</h3>
                <p>
                  Babylon to Novgorod, both regions bear your seal. Your
                  army has paid the final price; your Dominion remains.
                </p>
                <small
                  >Further regions and dimensions await a future chronicle. You
                  can continue summoning, or reset the save to begin anew.</small
                >
              </div>
            {:else if conquestVisible && city}
              <div class="conquest-grid">
                <div class="city-mark" aria-hidden="true">
                  <svg viewBox="0 0 110 130"
                    ><path
                      d="M5 120H105M12 115V50H32V37H44V24H66V37H78V50H98V115M8 50V39H17V46H24V39H33M77 39H86V46H93V39H102V50M32 115V62H78V115M45 115V88Q55 69 65 88V115M38 62V54H72V62M18 62H25M18 75H25M18 88H25M85 62H92M85 75H92M85 88H92M49 36H61M49 46H61"
                    /><circle cx="55" cy="11" r="7" /><path
                      d="M43 11H35M67 11H75M55 0V4"
                    /></svg
                  >
                </div>
                <div class="city-info">
                  <h3>{city.name}</h3>
                  <p>{city.description}</p>
                  <div class="progress-label">
                    <span>Army {fmt(power)} / Defense {fmt(city.strength)}</span
                    ><b>{fmt(readiness, 1)}% ready</b>
                  </div>
                  <PixelProgressBar
                    label={city.name + " conquest readiness"}
                    value={readiness}
                    showPile={false}
                  />
                </div>
                <div class="conquest-action">
                  <button
                    class="primary"
                    disabled={readiness < 100}
                    on:click={() => (conquestOpen = true)}
                    >Conquer {city.name}</button
                  ><small
                    >+{city.reward} permanent Dominion<br />{nextCity
                      ? (nextCity.region !== city.region ? "Unlock Slavic · March to " : "Then march to ") + nextCity.name
                      : "Complete both regions"}<br />Army and temporary
                    progress sacrificed</small
                  >
                </div>
              </div>
              {#if conquestOpen}<div class="confirmation" role="alert">
                  <p>
                    Sacrifice your entire army and reset Followers, Fanatics,
                    Essence, Knowledge, and all rituals? Gain <strong
                      >+{city.reward} Dominion</strong
                    >, raising permanent production to
                    <strong
                      >×{fmt(
                        dominionMultiplier(state).plus(
                          city.reward * rules.dominionBonus,
                        ),
                        2,
                      )}</strong
                    >. {nextCity
                      ? (nextCity.region !== city.region ? "Slavic unlocks with six new entities and new research. Your next city will be " : "Your next city will be ") + nextCity.name + "."
                      : "This victory completes the campaign."}
                  </p>
                  <button class="primary" on:click={prestige}
                    >Sacrifice army & claim Dominion</button
                  ><button on:click={() => (conquestOpen = false)}
                    >Keep preparing</button
                  >
                </div>{/if}
            {:else}<p class="section-note">
                Beyond the circle, the walls of {city?.name} await. Gather 35 Knowledge
                to reveal conquest.
              </p>{/if}
          </section>
        </div>
        <div
          class="chapter-panel"
          id="panel-empires"
          role="tabpanel"
          aria-labelledby="tab-empires"
          tabindex="0"
          hidden={activeTab !== "empires"}
        >
          <section class="future">
            <div class="world">
              <h2><span>V</span> The March of Empires</h2>
              {#each regions as routeRegion}
              <h3>{routeRegion.name} · {regionUnlocked(state, routeRegion.id) ? (region.id === routeRegion.id && !complete ? "Current region" : "Unlocked") : "Locked · Conquer Alexandria"}</h3>
              <div class="path">
                {#each cities as destination, i}{#if destination.region === routeRegion.id}<div
                    class="city-step"
                    class:active={i === state.campaign.cityIndex}
                    class:conquered={i < state.campaign.cityIndex}
                  >
                    <span class="city-number"
                      >{String(i + 1).padStart(2, "0")}</span
                    ><strong>{destination.name}</strong><small
                      >{i < state.campaign.cityIndex
                        ? "✓ CONQUERED"
                        : i === state.campaign.cityIndex
                          ? "CURRENT SIEGE"
                          : "DEFEAT " + cities[i - 1].name.toUpperCase()}</small
                    ><small
                      >{fmt(destination.strength)} defense · +{destination.reward}
                      Dominion</small
                    >
                  </div>{/if}{/each}
              </div>
              {/each}
              <p class="section-note">
                Cities → Regions → Countries → Continents → Earth → Destroy
                Earth → Dimensions
              </p>
            </div>
            <div>
              <h3>Traditions</h3>
              <p>European Demonology <b class="active-text">ACTIVE</b></p>
              <p>Slavic <b>{regionUnlocked(state, "slavic") ? "UNLOCKED" : "Locked · Conquer Alexandria"}</b></p>
              <p>Sumerian <small>Locked · Future chronicle</small></p>
              <p>Assyrian <small>Locked · Future chronicle</small></p>
            </div>
            <div>
              <h3>Dimensional Ascension</h3>
              <p>Earth → The Abyss → Astral Realm</p>
              <small>LOCKED · Conquer Earth</small>
              <p class="marginalia">The world is only the first page.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
    <details class="debug">
      <summary>Debug / Development Tools</summary>
      <p>
        These controls change your saved game. Unlocking reveals units without
        granting an army.
      </p>
      <div class="debug-actions">
        <button on:click={() => debug("essence")}>+1,000 Essence</button><button
          on:click={() => debug("knowledge")}>+100 Knowledge</button
        ><button on:click={() => debug("dominion")}>+10 Dominion</button><button
          aria-pressed={state.simulationSpeed === 10}
          on:click={() => debug("speed")}
          >{state.simulationSpeed === 10
            ? "Return to 1× speed"
            : "10× simulation speed"}</button
        ><button on:click={() => debug("unlock")}>Unlock all units</button
        ><button class="danger" on:click={() => (resetOpen = true)}
          >Reset save</button
        >
      </div>
    </details>
    {#if resetOpen}<div class="confirmation" role="alert">
        <p>
          Erase this manuscript, including all permanent Dominion? This cannot
          be undone.
        </p>
        <button class="danger" on:click={reset}>Erase all progress</button
        ><button on:click={() => (resetOpen = false)}>Cancel</button>
      </div>{/if}
  </main>
  <footer>
    <span>THE WORK IS NEVER FINISHED</span><span class:danger={saveError}
      >{saveError
        ? "Save failed · storage unavailable"
        : state.lastSave
          ? "Saved " + new Date(state.lastSave).toLocaleTimeString()
          : "Autosave every 15 seconds"}</span
    ><button class="text-button" on:click={() => save(true)}
      >Save manuscript</button
    >
  </footer>
</div>
