<script lang="ts">
  import Decimal from "break_infinity.js";
  import PixelProgressBar from "./PixelProgressBar.svelte";
  import PentagramBoard from "./PentagramBoard.svelte";
  import { knowledgeSources, units } from "./content";
  import { discoveredKnowledge, regionUnlocked } from "./state";
  import { formatNumber as fmt } from "./format";
  import {
    hasUpgrade,
    isAutomated,
    isUnlocked,
    multiplier,
    summon,
    summonCost,
    summonDuration,
    unitPower,
    upgradeLevel,
    drawPentagram,
    pentagramReward,
  } from "./simulation";
  import type { GameState } from "./types";
  import Tooltip from "./Tooltip.svelte";

  export let state: GameState;
  export let manualSummoning: boolean;
  export let capacity: number;
  export let occupied: number;
  export let running: string[];
  export let firstSummoning: boolean;
  export let nextUnit: (typeof units)[number] | undefined;
  export let regionalUnitCount: number;
  export let nextKnowledgeIndex: number;
  export let action: (fn: () => boolean) => void;
  export let pause: (id: string) => void;
  export let pauseAll: () => void;

  // Explicit arguments expose every dependency to Svelte's legacy reactivity.
  function summonReason(
    unit: (typeof units)[number],
    state: GameState,
    manualSummoning: boolean,
    occupied: number,
    capacity: number,
  ) {
    if (state.active[unit.id]) return "This entity is already binding or queued.";
    if (manualSummoning) return "Finish the current manual summoning first.";
    if (state.knowledgeSource && !isAutomated(state, unit.id))
      return "Deactivate the active Knowledge Source first.";
    if (occupied >= capacity) return "All summoning circles are occupied.";
    if (state.essence.lt(summonCost(state, unit)))
      return `Need ${fmt(summonCost(state, unit).minus(state.essence).max(0), 1)} more Essence.`;
    return "";
  }
</script>

<section class="army">
  <h2><span>II</span> The Summoning</h2>
  <details class="pentagram-drawing" open>
    <summary>Draw the Pentagram</summary>
    <p>Trace the seal to gather raw Essence and Knowledge.</p>
    <PentagramBoard
      on:complete={() => action(() => (drawPentagram(state), true))}
    /><small
      >Trace the heavy grey outline in one stroke · +{fmt(
        pentagramReward(state).essence,
        2,
      )} Essence · +{fmt(pentagramReward(state).knowledge, 2)} Knowledge</small
    >
  </details>
  {#if firstSummoning}<div class="opening">
      <p class="eyebrow">THE FIRST SUMMONING</p>
      <h3>Something stirs in the circle.</h3>
      <p>
        Draw the pentagram to gather Essence. Bind a Lesser Spirit for 10
        Essence; each spirit gathers more. Knowledge slowly reveals the next
        names.
      </p>
      <PixelProgressBar
        label="First summoning Essence"
        value={Math.min(100, state.essence.div(10).times(100).toNumber())}
      /><small
        >{fmt(Decimal.min(state.essence, 10), 1)} / 10 Essence · use the summon button
        below</small
      >
    </div>{/if}
  {#each units as unit, index}
    {@const reason = summonReason(unit, state, manualSummoning, occupied, capacity)}
    {#if isUnlocked(state, index)}
      <article class="unit">
        <div class="unit-head">
          <div>
            <span class="tier"
              >{[
                "I",
                "II",
                "III",
                "IV",
                "V",
                "VI",
                "VII",
                "VIII",
                "IX",
                "X",
                "XI",
                "XII",
              ][index]}</span
            >
            <h3>{unit.name}</h3>
            {#if unit.region}<small>Slavic</small>{/if}
          </div>
          <span class="owned"><b>{fmt(state.units[unit.id])}</b> bound</span>
        </div>
        <p class="unit-description">{unit.description}</p>
        <small
          >{upgradeLevel(state, "circle") > index
            ? "Fanatics trained to summon this entity"
            : `Automatic summoning requires Fanatic Training level ${index + 1}`}</small
        >
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
                    (state.progress[unit.id] / summonDuration(state, unit)) *
                      100,
                  ),
                ) + "% · "
              : ""}{fmt(summonDuration(state, unit), 1)} sec</span
          >
        </div>
        <PixelProgressBar
          label={unit.name + " summoning"}
          value={Math.min(
            100,
            (state.progress[unit.id] / summonDuration(state, unit)) * 100,
          )}
        />
        <div class="unit-meta">
          <span
            >{fmt(unitPower(state, unit))} power each ·
            <b>{fmt(state.units[unit.id].times(unitPower(state, unit)))}</b>
            total<br />+{fmt(
              unit.essencePerSecond.times(multiplier(state, "essence")),
              2,
            )} Essence/sec each{#if unit.knowledgePerSecond}<br />+{fmt(
                multiplier(state, "knowledge").times(unit.knowledgePerSecond),
                2,
              )} Knowledge/sec each{/if}</span
          ><Tooltip
            disabled={!!reason}
            text={reason}><button
            disabled={!!reason}
            on:click={() => action(() => summon(state, unit.id))}
            >{state.active[unit.id]
              ? running.includes(unit.id)
                ? "Binding · " + fmt(summonCost(state, unit), 1)
                : "Queued · " + fmt(summonCost(state, unit), 1)
              : occupied >= capacity
                ? "Circle occupied · " + fmt(summonCost(state, unit), 1)
                : "Summon · " + fmt(summonCost(state, unit), 1)}</button
          ></Tooltip>
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
  {#if nextUnit}<div class="locked-unit">
      <span class="eyebrow">THE NEXT NAME IS SEALED</span>
      <h3>{nextUnit.name}</h3>
      <p>
        Requires {fmt(nextUnit.unlockKnowledge)} Knowledge · {fmt(
          discoveredKnowledge(state),
          1,
        )} gathered
      </p>
      <small
        >{regionalUnitCount} orders of entities are available in this region.</small
      >
    </div>{/if}
    {#if !regionUnlocked(state, "slavic")}<p class="section-note">
      Conquer Alexandria to open Slavic: Will-o'-the-wisp, Water nymph, Vampire,
      Striga, Leshij, and Chort.
    </p>{/if}
</section>
<div class="summon-capacity">
  <strong>{running.length} / {capacity} circles occupied</strong>
  <p>
    {capacity === 1
      ? "You can conduct only one summoning at a time. Fanatics can help you open more circles."
      : "Your Fanatics help you conduct multiple summonings."}
  </p>
  {#if occupied > capacity}<small
      >Previously paid summons wait for a free circle; their progress is
      preserved.</small
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
          <span class="owned"
            >+{fmt(multiplier(state, "knowledge").times(source.value), 2)} / sec</span
          >
        </div>
        <p class="unit-description">{source.description}</p>
        <PixelProgressBar
          full={state.knowledgeSource === source.id}
          label={source.title + " study"}
          value={state.knowledgeSource === source.id ? 100 : 0}
        />
        <div class="unit-meta">
          <span>Requires {fmt(source.requirement)} discovered Knowledge</span
          ><Tooltip
            disabled={discoveredKnowledge(state).lt(source.requirement) ||
              manualSummoning}
            text={discoveredKnowledge(state).lt(source.requirement)
              ? `Discover ${fmt(Math.max(0, source.requirement - discoveredKnowledge(state).toNumber()), 1)} more Knowledge first.`
              : manualSummoning
                ? "Finish the current manual summoning first."
                : state.knowledgeSource === source.id
                  ? "Stop studying this source."
                  : "Begin studying this source."}
            ><button
            disabled={discoveredKnowledge(state).lt(source.requirement) ||
              manualSummoning}
            on:click={() =>
              action(() => {
                state.knowledgeSource =
                  state.knowledgeSource === source.id ? null : source.id;
                return true;
              })}
            >{state.knowledgeSource === source.id
              ? "Active · Deactivate"
              : "Study"}</button
            ></Tooltip>
        </div>
      </article>{:else if index === nextKnowledgeIndex}<article class="unit locked">
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
