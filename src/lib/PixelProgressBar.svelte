<script lang="ts">
  export let value = 0;
  export let full = false;
  export let showPile = true;
  export let label = "Progress";

  const pixelSize = 3;
  const rows = 9;

  function seededRandom(seed: number) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function generatePile(seedBase: number) {
    const particles: { col: number; row: number; shade: string; flicker: boolean; delay: number }[] = [];
    let seed = seedBase * 97 + 13;
    for (let col = 0; col < 30; col += 1) {
      const t = col / 30;
      const pileHeight = rows * Math.pow(Math.max(0, 1 - t), 1.8);
      const ground = rows - pileHeight;
      const density = Math.max(0, 0.95 - t * 1.05);
      for (let row = 0; row < rows; row += 1) {
        if (row < ground - 1.2) continue;
        seed += 1;
        const depth = Math.min(1, Math.max(0, (row - ground + 1.2) / (rows - ground + 1.2)));
        if (seededRandom(seed) >= density * (0.4 + 0.6 * depth)) continue;
        seed += 1;
        const shadeRoll = seededRandom(seed);
        const shade = shadeRoll > 0.82 ? "shade-dim" : shadeRoll > 0.55 ? "shade-mid" : "shade-bright";
        seed += 1;
        const flicker = seededRandom(seed) > 0.88;
        seed += 1;
        particles.push({ col, row, shade, flicker, delay: seededRandom(seed) * 1.2 });
      }
    }
    return particles;
  }

  $: safeValue = Math.min(100, Math.max(0, Number(value) || 0));
  $: particles = generatePile(full ? 100 : Math.round(safeValue));
</script>

<div
  class="bar"
  class:full
  style={`--offset:${safeValue - 100}%`}
  role="progressbar"
  aria-label={label}
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow={Math.round(safeValue)}
>
  {#if full}
    <span class="study-track" aria-hidden="true">
      <span class="study-pair">
      <span class="study-pile study-pile-mirror">
          {#each particles as particle}
            <b
              class="pixel {particle.shade}"
              class:flicker={particle.flicker}
              style:left={particle.col * pixelSize + "px"}
              style:top={particle.row * pixelSize + "px"}
              style:width={pixelSize + "px"}
              style:height={pixelSize + "px"}
              style:animation-delay={particle.delay + "s"}
            ></b>
          {/each}
        </span>
      <span class="study-pile ">
          {#each particles as particle}
            <b
              class="pixel {particle.shade}"
              class:flicker={particle.flicker}
              style:left={particle.col * pixelSize + "px"}
              style:top={particle.row * pixelSize + "px"}
              style:width={pixelSize + "px"}
              style:height={pixelSize + "px"}
              style:animation-delay={particle.delay + "s"}
            ></b>
          {/each}
        </span>
        
      </span>
    </span>
  {:else if value == 0}
    <div></div>
  {:else}
    <i></i>
    {#if showPile}
      <span class="pile-layer" style:left={safeValue + "%"} aria-hidden="true">
        {#each particles as particle}
          <b
            class="pixel {particle.shade}"
            class:flicker={particle.flicker}
            style:left={particle.col * pixelSize + "px"}
            style:top={particle.row * pixelSize + "px"}
            style:width={pixelSize + "px"}
            style:height={pixelSize + "px"}
            style:animation-delay={particle.delay + "s"}
          ></b>
        {/each}
      </span>
    {/if}
  {/if}
</div>
