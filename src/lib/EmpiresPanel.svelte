<script lang="ts">
  import { cities, regions } from "./content";
  import { formatNumber as fmt } from "./format";
  import { regionUnlocked } from "./state";
  import type { GameState } from "./types";

  export let state: GameState;
  export let region: (typeof regions)[number];
  export let complete: boolean;
</script>

<section class="future">
  <div class="world">
    <h2><span>V</span> The March of Empires</h2>
    {#each regions as routeRegion}<h3>
        {routeRegion.name} · {regionUnlocked(state, routeRegion.id)
          ? region.id === routeRegion.id && !complete
            ? "Current region"
            : "Unlocked"
          : "Locked · Conquer Alexandria"}
      </h3>
      <div class="path">
        {#each cities as destination, i}{#if destination.region === routeRegion.id}<div
              class="city-step"
              class:active={i === state.campaign.cityIndex}
              class:conquered={i < state.campaign.cityIndex}
            >
              <span class="city-number">{String(i + 1).padStart(2, "0")}</span
              ><strong>{destination.name}</strong><small
                >{i < state.campaign.cityIndex
                  ? "✓ CONQUERED"
                  : i === state.campaign.cityIndex
                    ? "CURRENT SIEGE"
                    : "DEFEAT " + cities[i - 1].name.toUpperCase()}</small
              ><small
                >{fmt(destination.strength)} defense · +{destination.reward} Dominion</small
              >
            </div>{/if}{/each}
      </div>{/each}
    <p class="section-note">
      Cities → Regions → Countries → Continents → Earth → Destroy Earth →
      Dimensions
    </p>
  </div>
  <div>
    <h3>Traditions</h3>
    <p>European Demonology <b class="active-text">ACTIVE</b></p>
    <p>
      Slavic <b
        >{regionUnlocked(state, "slavic")
          ? "UNLOCKED"
          : "Locked · Conquer Alexandria"}</b
      >
    </p>
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
