<script lang="ts">
  import { onDestroy } from "svelte";

  export let text: string;
  export let disabled = false;

  let container: HTMLSpanElement;
  let tooltip: HTMLSpanElement | null = null;
  let hovered = false;
  let focused = false;

  // Keep the portal synchronized while the game changes under the pointer.
  $: syncTooltip(disabled, text, hovered || focused);

  function syncTooltip(blocked: boolean, message: string, active: boolean) {
    if (!blocked || !message || !active) {
      hide();
      return;
    }
    show();
    if (tooltip) {
      tooltip.textContent = message;
      updatePosition();
    }
  }

  function updatePosition() {
    if (!container || !tooltip) return;
    const anchor = container.querySelector("button") ?? container;
    const rect = anchor.getBoundingClientRect();
    const gap = 10;
    const margin = 8;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const above = rect.top >= height + gap;
    const top = above ? rect.top - height - gap : rect.bottom + gap;
    const left = Math.max(
      margin,
      Math.min(window.innerWidth - width - margin, rect.left + rect.width / 2 - width / 2),
    );
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${Math.max(margin, top)}px`;
    tooltip.style.setProperty("--arrow-left", `${rect.left + rect.width / 2 - left}px`);
    tooltip.classList.toggle("tooltip-below", !above);
  }

  function show() {
    if (!disabled || !text || tooltip) return;
    tooltip = document.createElement("span");
    tooltip.className = "tooltip-portal";
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
    updatePosition();
    requestAnimationFrame(() => tooltip?.classList.add("tooltip-visible"));
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
  }

  function hide() {
    if (!tooltip) return;
    tooltip.remove();
    tooltip = null;
    window.removeEventListener("resize", updatePosition);
    window.removeEventListener("scroll", updatePosition, true);
  }

  onDestroy(hide);
</script>

<span
  class="tooltip-container"
  role="presentation"
  bind:this={container}
  on:pointerenter={() => (hovered = true)}
  on:pointerleave={() => (hovered = false)}
  on:focusin={() => (focused = true)}
  on:focusout={() => (focused = false)}
>
  <slot />
</span>
