<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  export let size = 440;
  const dispatch = createEventDispatcher<{ complete: void }>();
  let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;
  let drawing = false,
    last: { x: number; y: number } | null = null,
    length = 0,
    points = 0,
    offBand = 0;
  const cx = size / 2,
    cy = size / 2,
    r = size * 0.38;
  const v = [0, 1, 2, 3, 4].map((i) => ({
    x: cx + r * Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
    y: cy + r * Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 5),
  }));
  const path = [0, 2, 4, 1, 3, 0].map((i) => v[i]);
  const local = (e: PointerEvent) => {
    const b = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - b.left) * size) / b.width,
      y: ((e.clientY - b.top) * size) / b.height,
    };
  };
  const segmentDistance = (
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
  ) => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy),
        ),
      );
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  };
  const templateDistance = (p: { x: number; y: number }) =>
    Math.min(
      ...path.slice(0, -1).map((a, i) => segmentDistance(p, a, path[i + 1])),
    );
  function template() {
    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 26;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.miterLimit = 10;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
  }
  function down(e: PointerEvent) {
    drawing = true;
    length = 0;
    points = 0;
    offBand = 0;
    last = local(e);
    canvas.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!drawing || !last) return;
    const p = local(e);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    length += Math.hypot(p.x - last.x, p.y - last.y);
    points++;
    if (templateDistance(p) > 13) offBand++;
    last = p;
  }
  function up() {
    if (
      drawing &&
      length > size * 3.2 &&
      points > 20 &&
      offBand / points <= 0.08
    ) {
      dispatch("complete");
      reset();
    }
    drawing = false;
    last = null;
  }
  function reset() {
    template();
    length = 0;
    points = 0;
    offBand = 0;
  }
  onMount(() => {
    ctx = canvas.getContext("2d")!;
    template();
  });
</script>

<div class="board">
  <canvas
    bind:this={canvas}
    width={size}
    height={size}
    on:pointerdown={down}
    on:pointermove={move}
    on:pointerup={up}
    on:pointercancel={up}
  ></canvas>
  <div class="hud">
    <span>Trace the grey pentagram in one stroke</span><button on:click={reset}
      >Reset</button
    >
  </div>
</div>

<style>
  .board {
    display: grid;
    gap: 0.5rem;
    justify-items: center;
  }
  canvas {
    width: 100%;
    max-width: 30rem;
    height: auto;
    background: #000;
    border: 1px solid #fff;
    touch-action: none;
    cursor: crosshair;
  }
  .hud {
    display: flex;
    gap: 1rem;
    align-items: center;
    color: #fff;
    font-size: 0.8rem;
  }
  .hud button {
    background: #000;
    color: #fff;
    border: 1px solid #fff;
    padding: 0.25rem 0.6rem;
  }
</style>
