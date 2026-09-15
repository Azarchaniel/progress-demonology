<script lang="ts">
  import { onMount } from "svelte";
  import packageJson from "../package.json";
  import { cities, units, rules, knowledgeSources } from "./lib/content";
  import Reservoir from "./lib/Reservoir.svelte";
  import SummoningPanel from "./lib/SummoningPanel.svelte";
  import ConquestPanel from "./lib/ConquestPanel.svelte";
  import EmpiresPanel from "./lib/EmpiresPanel.svelte";
  import UpgradeTree from "./lib/UpgradeTree.svelte";
  import { summonCapacity, activeSummons, runningSummons } from "./lib/cult";
  import { formatNumber as fmt } from "./lib/format";
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
    tick,
    buyUpgrade,
    conquer,
    isAutomated,
    currentCity,
    campaignComplete,
    dominionMultiplier,
    isUnlocked,
  } from "./lib/simulation";

  let state = loadState();
  let notice = loadNotice;
  let activeTab = "summoning";
  let resetOpen = false;
  let conquestOpen = false;
  let saveError = false;
  const tabs = [
    { id: "summoning", numeral: "II", label: "The Summoning" },
    { id: "rituals", numeral: "III", label: "Rituals & Seals" },
    { id: "conquest", numeral: "IV", label: "Conquest" },
    { id: "empires", numeral: "V", label: "Empires" },
  ];
  $: availableTabs = tabs.filter(
    (tab) => tab.id !== "empires" || state.conquest.victories > 0,
  );
  $: power = armyPower(state);
  $: manualSummoning = units.some(
    (u) =>
      state.active[u.id] &&
      (!isAutomated(state, u.id) || state.automationPaused[u.id]),
  );
  $: city = currentCity(state);
  $: nextCity = cities[state.campaign.cityIndex + 1];
  $: complete = campaignComplete(state);
  $: region = currentRegion(state);
  $: regionalCities = cities.filter((c) => c.region === region.id);
  $: regionalUnitCount = units.filter((u) =>
    regionUnlocked(state, u.region),
  ).length;
  $: readiness = city
    ? Math.min(100, power.div(city.strength).times(100).toNumber())
    : 100;
  $: firstSummoning =
    units.every((unit) => state.units[unit.id].eq(0)) &&
    state.conquest.victories === 0;
  $: ritualsOpen =
    discoveredKnowledge(state).gte(8) || state.conquest.victories > 0;
  $: conquestVisible =
    discoveredKnowledge(state).gte(35) || state.conquest.victories > 0;
  $: nextUnit = units.find(
    (u, index) => regionUnlocked(state, u.region) && !isUnlocked(state, index),
  );
  $: nextKnowledgeIndex = knowledgeSources.findIndex((source) =>
    discoveredKnowledge(state).lt(source.requirement),
  );
  $: capacity = summonCapacity(state);
  $: occupied = activeSummons(state);
  $: running = runningSummons(state);

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
  function save(manual = false) {
    saveError = !saveState(state);
    if (manual)
      notice = saveError
        ? "Save failed. Browser storage may be full or disabled."
        : "Your manuscript has been saved.";
    state = state;
  }
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
      if (fallen === "Alexandria")
        notice =
          "Alexandria has fallen. Slavic unlocked: six new cities, six new entities, and seven new research seals. The march continues to Nitra.";
      save();
    }
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
      <svg class="ancient-emblem" viewBox="0 0 440 100" aria-hidden="true"
        ><circle cx="220" cy="43" r="29" /><circle
          cx="220"
          cy="43"
          r="21"
        /><path
          class="solid"
          d="M220 17 225 35 242 25 231 42 246 47 229 51 236 68 220 57 204 68 211 51 194 47 209 42 198 25 215 35Z"
        /><path
          d="M189 32 18 14 47 36 184 46M183 48 43 39 67 57 188 57M191 61 70 61 94 76 200 69M251 32 422 14 393 36 256 46M257 48 397 39 373 57 252 57M249 61 370 61 346 76 240 69M210 73 196 92 220 85 244 92 230 73"
        /><path
          d="M49 21 66 38M75 24 91 40M102 27 117 42M129 29 143 43M155 31 166 45M391 21 374 38M365 24 349 40M338 27 323 42M311 29 297 43M285 31 274 45M220 2V9M176 9 184 17M264 9 256 17"
        /></svg
      >
      <h1>Progress Demonology</h1>
      <p class="subtitle">From the ashes of one empire, another shall rise.</p>
    </div>
    <div class="edition">VOL. I<span>v{packageJson.version}</span></div>
  </header>
  <main style="position: relative">
    <p class="eyebrow-absolute">
      REGION · {region.name} · {complete
        ? "CONQUERED"
        : `CITY ${state.campaign.cityIndex - region.startIndex + 1} / ${regionalCities.length}`}
    </p>
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
      <Reservoir {state} {power} {capacity} {action} />
      <div class="workspace-content">
        <div
          class="manuscript-tabs"
          role="tablist"
          aria-label="Manuscript chapters"
        >
          {#each availableTabs as tab, index}<button
              id={"tab-" + tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={"panel-" + tab.id}
              tabindex={activeTab === tab.id ? 0 : -1}
              on:click={() => selectTab(tab.id)}
              on:keydown={(event) => navigateTabs(event, index)}
              ><span>{tab.numeral}</span>{tab.label}</button
            >{/each}
        </div>
        <div
          class="chapter-panel"
          id="panel-summoning"
          role="tabpanel"
          aria-labelledby="tab-summoning"
          tabindex="0"
          hidden={activeTab !== "summoning"}
        >
          <SummoningPanel
            {state}
            {manualSummoning}
            {capacity}
            {occupied}
            {running}
            {firstSummoning}
            {nextUnit}
            {regionalUnitCount}
            {nextKnowledgeIndex}
            {action}
            {pause}
            {pauseAll}
          />
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
            {#if ritualsOpen}<p class="section-note">
                Research spends Essence and Knowledge. Drag the map to explore;
                use the wheel or buttons to zoom. Double click for quick buy.
              </p>
              <UpgradeTree
                {state}
                on:buy={(event) =>
                  action(() => buyUpgrade(state, event.detail))}
              />{:else}<div class="sealed">
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
          <ConquestPanel
            {state}
            {city}
            {nextCity}
            {power}
            {readiness}
            {complete}
            {conquestVisible}
            bind:conquestOpen
            {prestige}
          />
        </div>
        <div
          class="chapter-panel"
          id="panel-empires"
          role="tabpanel"
          aria-labelledby="tab-empires"
          tabindex="0"
          hidden={activeTab !== "empires"}
        >
          <EmpiresPanel {state} {region} {complete} />
        </div>
      </div>
    </div>
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
          : "Autosave every 30 seconds"}</span
    ><button class="text-button" on:click={() => save(true)}
      >Save manuscript</button
    >
  </footer>
</div>
