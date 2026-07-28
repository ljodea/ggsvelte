<script lang="ts">
  import { onMount } from "svelte";
  import type { ColorScaleSpec } from "@ggsvelte/spec";

  import { observeNearViewport } from "$lib/near-viewport";

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
    const stop = observeNearViewport(
      el,
      () => {
        if (cancelled || Live !== null) return;
        void import("./SequentialColorLabLive.svelte").then((mod) => {
          if (!cancelled) Live = mod.default;
        });
      },
      { rootMargin: "480px 0px" },
    );
    return () => {
      cancelled = true;
      stop();
    };
  });
</script>

<div class="plot-panel" bind:this={host} style:min-height="{height}px">
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
