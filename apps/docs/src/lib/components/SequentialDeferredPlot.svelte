<script lang="ts">
  import { onMount } from "svelte";
  import type { ColorScaleSpec } from "@ggsvelte/spec";

  const {
    label,
    scale,
    staticSvg,
    height = 360,
  }: {
    label: string;
    scale: ColorScaleSpec;
    staticSvg: string;
    height?: number;
  } = $props();

  let host = $state<HTMLDivElement | null>(null);
  let Live = $state<
    typeof import("./SequentialColorLabLive.svelte").default | null
  >(null);

  onMount(() => {
    const el = host;
    if (el === null) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void import("./SequentialColorLabLive.svelte").then((mod) => {
            if (!cancelled) Live = mod.default;
          });
          io.disconnect();
        }
      },
      { rootMargin: "480px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
  });
</script>

<div class="plot-panel" bind:this={host}>
  {#if Live !== null}
    <Live {label} {scale} {height} />
  {:else}
    {@html staticSvg}
  {/if}
</div>

<style>
  .plot-panel {
    width: min(100%, 52rem);
    min-width: 0;
  }

  .plot-panel :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }
</style>
