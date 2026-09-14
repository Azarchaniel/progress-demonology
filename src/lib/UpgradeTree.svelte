<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { upgrades, units } from "./content";
  import {
    canBuyUpgrade,
    hasUpgrade,
    upgradeRequirements,
    upgradeLevel,
    upgradePrice,
    upgradeMaxed,
    nextTrainingEntity,
    trainingRegionLocked,
  } from "./simulation";
  import { regionUnlocked } from "./state";
  import { formatNumber as fmt } from "./format";
  import type { GameState, UpgradeDefinition } from "./types";

  export let state: GameState;
  const dispatch = createEventDispatcher<{ buy: string }>();
  const branches = [
    "Forbidden Study",
    "Pentagram",
    "Automation",
    "Candles",
    "Sacred Geometry",
    "Incense",
    "Follower Gain",
  ];
  const depth = (u: UpgradeDefinition): number =>
    Math.max(
      0,
      ...upgradeRequirements(u).map(
        (id) => depth(upgrades.find((v) => v.id === id)!) + 1,
      ),
    );
  const nodes = upgrades.map((upgrade) => ({
    upgrade,
    x: 40 + branches.indexOf(upgrade.category) * 248,
    y: 100 + depth(upgrade) * 186,
  }));
  const width = branches.length * 248 + 56;
  const height = Math.max(...nodes.map((n) => n.y)) + 210;
  const edges = nodes.flatMap((node) =>
    upgradeRequirements(node.upgrade).map((id) => ({
      from: nodes.find((n) => n.upgrade.id === id)!,
      to: node,
    })),
  );
  let viewport: HTMLDivElement;
  let zoom = 0.8;
  let selected = "study";
  let dragging = false;
  let drag: {
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
  } | null = null;
  $: upgrade = upgrades.find((u) => u.id === selected)!;
  $: owned = upgradeMaxed(state, upgrade);
  $: price = upgradePrice(state, upgrade);
  $: level = upgradeLevel(state, selected);
  $: next = upgrade.repeatable ? nextTrainingEntity(state) : undefined;
  $: regionLocked =
    !regionUnlocked(state, upgrade.region) ||
    (!!upgrade.repeatable && trainingRegionLocked(state));
  $: missing = upgradeRequirements(upgrade).filter(
    (id) => !hasUpgrade(state, id),
  );
  $: acquired = upgrades.filter((u) => hasUpgrade(state, u.id)).length;

  function setZoom(
    value: number,
    x = viewport.clientWidth / 2,
    y = viewport.clientHeight / 2,
  ) {
    const next = Math.max(0.15, Math.min(1.5, value));
    const left = ((viewport.scrollLeft + x) / zoom) * next - x;
    const top = ((viewport.scrollTop + y) / zoom) * next - y;
    zoom = next;
    requestAnimationFrame(() => {
      viewport.scrollLeft = left;
      viewport.scrollTop = top;
    });
  }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    setZoom(
      zoom * Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * 0.002),
      event.clientX - rect.left,
      event.clientY - rect.top,
    );
  }
  function down(event: PointerEvent) {
    if (
      event.pointerType !== "mouse" ||
      event.button !== 0 ||
      (event.target as HTMLElement).closest("button")
    )
      return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
    };
    dragging = true;
    viewport.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    viewport.scrollLeft = drag.left - event.clientX + drag.x;
    viewport.scrollTop = drag.top - event.clientY + drag.y;
  }
  function stop() {
    drag = null;
    dragging = false;
  }
  function fit() {
    zoom = Math.max(
      0.15,
      Math.min(1, viewport.clientWidth / width, viewport.clientHeight / height),
    );
    viewport.scrollTo(0, 0);
  }
  function keys(event: KeyboardEvent) {
    if (event.target !== viewport) return;
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setZoom(zoom + 0.1);
    }
    if (event.key === "-") {
      event.preventDefault();
      setZoom(zoom - 0.1);
    }
    if (event.key === "Home") {
      event.preventDefault();
      viewport.scrollTo(0, 0);
    }
  }
</script>

<div class="research">
  <div class="toolbar">
    <div>
      <span class="eyebrow">THE TREE OF FORBIDDEN ARTS</span>
      <p>
        {acquired} / {upgrades.length} inscribed · {fmt(state.knowledge, 1)} Knowledge
        available
      </p>
    </div>
    <div class="controls" aria-label="Research map controls">
      <button
        aria-label="Zoom out"
        disabled={zoom <= 0.15}
        on:click={() => setZoom(zoom - 0.1)}>−</button
      >
      <output aria-label="Zoom level">{Math.round(zoom * 100)}%</output>
      <button
        aria-label="Zoom in"
        disabled={zoom >= 1.5}
        on:click={() => setZoom(zoom + 0.1)}>+</button
      >
      <button on:click={fit}>Fit tree</button>
      <button
        on:click={() => {
          zoom = 0.8;
          viewport.scrollTo(0, 0);
        }}>Reset view</button
      >
    </div>
  </div>
  <div class="legend">
    <span>◇ Locked</span><span>○ Saving</span><span>✧ Available</span><span
      >✓ Inscribed</span
    >
  </div>
  <!-- Scrollable map needs keyboard focus for native arrow-key panning. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex a11y_no_noninteractive_element_interactions -->
  <div
    class="viewport"
    class:dragging
    bind:this={viewport}
    role="region"
    aria-label="Research tree. Drag to pan, wheel or plus and minus to zoom. Arrow keys scroll."
    tabindex="0"
    on:wheel|nonpassive={wheel}
    on:pointerdown={down}
    on:pointermove={move}
    on:pointerup={stop}
    on:pointercancel={stop}
    on:lostpointercapture={stop}
    on:keydown={keys}
  >
    <div
      class="extent"
      style:width={width * zoom + "px"}
      style:height={height * zoom + "px"}
    >
      <div
        class="map"
        style:width={width + "px"}
        style:height={height + "px"}
        style:transform={"scale(" + zoom + ")"}
      >
        <svg {width} {height} aria-hidden="true">
          <path d={"M150 72 H" + (150 + (branches.length - 1) * 248)} />
          {#each branches as branch, i}<path
              d={"M" + (150 + i * 248) + " 72 V100"}
            />{/each}
          {#each edges as edge}
            <path
              class:complete={hasUpgrade(state, edge.from.upgrade.id)}
              d={`M${edge.from.x + 110} ${edge.from.y + 148} V${edge.to.y - 20} H${edge.to.x + 110} V${edge.to.y}`}
            />
          {/each}
        </svg>
        {#each branches as branch, i}<div
            class="branch"
            style:left={40 + i * 248 + "px"}
          >
            {branch}
          </div>{/each}
        {#each nodes as node}
          {@const inscribed = upgradeMaxed(state, node.upgrade)}
          {@const locked =
            !regionUnlocked(state, node.upgrade.region) ||
            (!!node.upgrade.repeatable && trainingRegionLocked(state)) ||
            upgradeRequirements(node.upgrade).some(
              (id) => !hasUpgrade(state, id),
            )}
          {@const available = canBuyUpgrade(state, node.upgrade.id)}
          <button
            class="node"
            class:selected={selected === node.upgrade.id}
            class:inscribed
            class:locked
            class:available
            style:left={node.x + "px"}
            style:top={node.y + "px"}
            aria-pressed={selected === node.upgrade.id}
            on:click={() => (selected = node.upgrade.id)}
          >
            <span class="status"
              >{inscribed
                ? "✓ Inscribed"
                : locked
                  ? (node.upgrade.region &&
                      !regionUnlocked(state, node.upgrade.region)) ||
                    (node.upgrade.repeatable && trainingRegionLocked(state))
                    ? "◇ Slavic · Locked"
                    : "◇ Locked"
                  : available
                    ? "✧ Available"
                    : "○ Saving"}</span
            >
            <strong
              >{node.upgrade.name}{#if node.upgrade.repeatable}
                · {upgradeLevel(
                  state,
                  node.upgrade.id,
                )}/{units.length}{/if}</strong
            >
            {#if node.upgrade.repeatable && inscribed}<span
                >All entities learned</span
              >{:else}
              <span
                >{fmt(upgradePrice(state, node.upgrade).knowledge)} Knowledge</span
              >
              <small
                >{fmt(upgradePrice(state, node.upgrade).essence)} Essence</small
              >{/if}
          </button>
        {/each}
      </div>
    </div>
  </div>
  <div class="details" aria-live="polite">
    <div>
      <span class="eyebrow">{upgrade.category}</span>
      <h3>{upgrade.name}</h3>
      <p>{upgrade.description}</p>
      {#if upgrade.repeatable}<p>
          Level {level} / {units.length} · {next
            ? "Next: " + next.name
            : "All entities learned"}
        </p>
        <small
          >Essence price ×3 and Knowledge price ×2 per level. Slavic levels
          require Alexandria.</small
        >{/if}
      {#if upgrade.region}<small
          >Slavic · Unlocked by conquering Alexandria</small
        >{/if}
      {#if upgradeRequirements(upgrade).length}<small
          >Requires: {upgradeRequirements(upgrade)
            .map((id) => upgrades.find((u) => u.id === id)!.name)
            .join(" + ")}</small
        >{/if}
    </div>
    <div class="purchase">
      <p>
        {owned && upgrade.repeatable
          ? "Training complete"
          : `${fmt(price.knowledge)} Knowledge + ${fmt(price.essence)} Essence`}
      </p>
      <button
        disabled={!canBuyUpgrade(state, selected)}
        on:click={() => dispatch("buy", selected)}
        >{owned
          ? "✓ Inscribed"
          : upgrade.repeatable
            ? `Research level ${level + 1} · ${next?.name ?? ""}`
            : "Research " + upgrade.name}</button
      >
      {#if !owned}<small
          >{regionLocked
            ? "Conquer Alexandria to unlock Slavic research."
            : missing.length
              ? "Research the required seals first."
              : canBuyUpgrade(state, selected)
                ? "Both resources are spent on research."
                : `Still needed: ${fmt(price.essence.minus(state.essence).max(0))} Essence · ${fmt(price.knowledge.minus(state.knowledge).max(0), 1)} Knowledge`}</small
        >{/if}
    </div>
  </div>
</div>

<style>
  .research {
    border: 1px solid #fff;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    padding: 1rem;
  }
  .toolbar p {
    margin: 0.5rem 0 0;
    font-size: 0.8rem;
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  output {
    min-width: 3rem;
    text-align: center;
    font-size: 0.8rem;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0 1rem 1rem;
    font-size: 0.75rem;
  }
  .viewport {
    height: clamp(340px, 58vh, 620px);
    overflow: auto;
    border-block: 1px solid #fff;
    cursor: grab;
    overscroll-behavior: contain;
    touch-action: pan-x pan-y;
  }
  .viewport:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -5px;
  }
  .dragging {
    cursor: grabbing;
    user-select: none;
  }
  .extent {
    position: relative;
  }
  .map {
    position: absolute;
    top: 0;
    left: 0;
    transform-origin: top left;
  }
  svg {
    position: absolute;
    inset: 0;
    pointer-events: none;
    fill: none;
    stroke: #fff;
    stroke-width: 1;
  }
  path {
    stroke-dasharray: 3 5;
  }
  path.complete {
    stroke-dasharray: none;
    stroke-width: 2;
  }
  .branch {
    position: absolute;
    top: 32px;
    width: 220px;
    text-align: center;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .node {
    position: absolute;
    width: 220px;
    height: 148px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.45rem;
    text-align: left;
    background: #000;
    padding: 16px;
  }
  .node strong {
    font-size: 1rem;
  }
  .node .status {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  .node.locked {
    border-style: dashed;
  }
  .node.available {
    border: 3px double #fff;
  }
  .node.inscribed,
  .node.inscribed:hover {
    background: #fff;
    color: #000;
  }
  .node.selected {
    outline: 2px solid #fff;
    outline-offset: 5px;
  }
  .details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    padding: 1.25rem;
    min-height: 175px;
  }
  .details h3 {
    margin: 0.5rem 0;
  }
  .details p {
    font-size: 0.85rem;
    margin-bottom: 0.65rem;
  }
  .details small {
    display: block;
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .purchase button {
    width: 100%;
    margin-bottom: 0.6rem;
  }
  .purchase button:disabled {
    border-style: dashed;
  }
  @media (max-width: 600px) {
    .details {
      grid-template-columns: 1fr;
    }
  }
</style>
