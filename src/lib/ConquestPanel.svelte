<script lang="ts">
  import Decimal from "break_infinity.js";
  import PixelProgressBar from "./PixelProgressBar.svelte";
  import { rules } from "./content";
  import { formatNumber as fmt } from "./format";
  import { dominionMultiplier } from "./simulation";
  import type { CityDefinition, GameState } from "./types";

  export let state: GameState;
  export let city: CityDefinition | undefined;
  export let nextCity: CityDefinition | undefined;
  export let power: Decimal;
  export let readiness: number;
  export let complete: boolean;
  export let conquestVisible: boolean;
  export let conquestOpen: boolean;
  export let prestige: () => void;
</script>

<section class="conquest">
  <div class="section-heading">
    <h2><span>IV</span> Conquest</h2>
    <span class="eyebrow">AN ARMY FOR AN EMPIRE</span>
  </div>
  {#if complete}<div class="campaign-ending">
      <p class="eyebrow">THE LAST GATE HAS OPENED</p>
      <h3>Twelve cities. Two regions. One Dominion.</h3>
      <p>
        Babylon to Novgorod, both regions bear your seal. Your army has paid the
        final price; your Dominion remains.
      </p>
      <small
        >Further regions and dimensions await a future chronicle. You can
        continue summoning, or reset the save to begin anew.</small
      >
    </div>
  {:else if conquestVisible && city}<div class="conquest-grid">
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
          <span>Army {fmt(power)} / Defense {fmt(city.strength)}</span><b
            >{fmt(readiness, 1)}% ready</b
          >
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
          on:click={() => (conquestOpen = true)}>Conquer {city.name}</button
        ><small
          >+{city.reward} permanent Dominion<br />{nextCity
            ? (nextCity.region !== city.region
                ? "Unlock Slavic · March to "
                : "Then march to ") + nextCity.name
            : "Complete both regions"}<br />Army and temporary progress
          sacrificed</small
        >
      </div>
    </div>
    {#if conquestOpen}<div class="confirmation" role="alert">
        <p>
          Sacrifice your entire army and reset Followers, Fanatics, Essence,
          Knowledge, and all rituals? Gain <strong
            >+{city.reward} Dominion</strong
          >, raising permanent production to
          <strong
            >×{fmt(
              dominionMultiplier(state).plus(city.reward * rules.dominionBonus),
              2,
            )}</strong
          >. {nextCity
            ? (nextCity.region !== city.region
                ? "Slavic unlocks with six new entities and new research. Your next city will be "
                : "Your next city will be ") +
              nextCity.name +
              "."
            : "This victory completes the campaign."}
        </p>
        <button class="primary" on:click={prestige}
          >Sacrifice army & claim Dominion</button
        ><button on:click={() => (conquestOpen = false)}>Keep preparing</button>
      </div>{/if}
  {:else}<p class="section-note">
      Beyond the circle, the walls of {city?.name} await. Gather 35 Knowledge to reveal
      conquest.
    </p>{/if}
</section>
