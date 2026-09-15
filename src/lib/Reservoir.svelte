<script lang="ts">
  import Decimal from "break_infinity.js";
  import PixelProgressBar from "./PixelProgressBar.svelte";
  import { cultRules } from "./content";
  import {
    fanaticSpeed,
    followerInterval,
    canPromote,
    promoteFanatic,
    fanaticPromotionCost,
    followerGate,
  } from "./cult";
  import { formatNumber as fmt, formatRate, formatTime } from "./format";
  import { discoveredKnowledge } from "./state";
  import { essenceRate, knowledgeRate } from "./simulation";
  import type { GameState } from "./types";

  export let state: GameState;
  export let power: Decimal;
  export let capacity: number;
  export let action: (fn: () => boolean) => void;
</script>

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
    ><small>{fmt(discoveredKnowledge(state), 1)} discovered this run</small>
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
        value={Math.min(
          100,
          (state.cult.progress / followerInterval(state)) * 100,
        )}
      />
      <small
        >Next arrival in {fmt(
          Math.max(0, followerInterval(state) - state.cult.progress),
          1,
        )} sec</small
      >
    {:else}<p>
        Reach Lesser Demon to attract Followers. Their faith will become your
        strength.
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
      )} Essence.<br />Requires {cultRules.promotionKnowledge} Knowledge (not spent).</small
    >
    <p>
      Each Fanatic: +{cultRules.speedPerFanatic * 100}% summoning speed.<br
      />Every {cultRules.fanaticsPerCircle} Fanatics: +1 simultaneous circle, up to
      6.
    </p>
    <small
      >Current aid: ×{fmt(fanaticSpeed(state), 2)} speed · {capacity}
      {capacity === 1 ? "circle" : "circles"}.<br />Followers and Fanatics reset
      after conquest.</small
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
  <p class="marginalia">“What is called forth<br />cannot be forgotten.”</p>
  <div class="run-clock">
    <span>Time in this invocation</span><b>{formatTime(state.runTime)}</b>
  </div>
  {#if state.simulationSpeed === 10}<p class="debug-badge">
      DEBUG · 10× TIME
    </p>{/if}
</aside>
