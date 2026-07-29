<script lang="ts">
  /**
   * Example detail frame: paint the gallery PNG first, then upgrade to the
   * live Example.svelte chart near the viewport so first paint / LCP do not
   * wait on the chart stack.
   *
   * `?vr` forces an immediate upgrade so visual regression can wait on
   * `.gg-plot-root[data-gg-ready]` without racing IntersectionObserver.
   */
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import type { Component } from "svelte";

  import { loadExampleComponent } from "$lib/examples";
  import { observeNearViewport } from "$lib/near-viewport";

  const {
    exampleId,
    previewPath,
    title,
    width,
    height,
    fullWidth = false,
  }: {
    exampleId: string;
    previewPath: string;
    title: string;
    width: number;
    height: number;
    fullWidth?: boolean;
  } = $props();

  let host = $state<HTMLDivElement | null>(null);
  let Live = $state<Component | null>(null);
  let loadStarted = false;
  let cancelled = false;

  function startLoad(): void {
    if (loadStarted || Live !== null) return;
    loadStarted = true;
    void loadExampleComponent(exampleId).then((component) => {
      if (!cancelled) Live = component;
    });
  }

  // Kick off the VR import as soon as the client module runs (before paint
  // settles). onMount still owns near-viewport upgrades for normal visits.
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    if (params.has("vr")) startLoad();
  }

  onMount(() => {
    cancelled = false;
    if (Live !== null || loadStarted) {
      return () => {
        cancelled = true;
      };
    }
    const el = host;
    if (el === null) {
      return () => {
        cancelled = true;
      };
    }
    const stop = observeNearViewport(el, startLoad, {
      rootMargin: "480px 0px",
    });
    return () => {
      cancelled = true;
      stop();
    };
  });
</script>

<div
  class="gg-example-frame"
  class:full-width={fullWidth}
  bind:this={host}
  style={`--example-vr-width:${String(width)}px;--example-vr-height:${String(height)}px`}
>
  {#if Live !== null}
    <Live />
  {:else}
    <img
      class="example-preview"
      src={`${base}${previewPath}`}
      alt={title}
      {width}
      {height}
      decoding="async"
      fetchpriority="high"
    />
  {/if}
</div>

<style>
  .gg-example-frame {
    margin: 2.5rem 0;
    width: 100%;
    max-width: var(--example-vr-width);
    min-width: 0;
  }

  .gg-example-frame.full-width {
    max-width: none;
  }

  .example-preview {
    display: block;
    width: 100%;
    height: auto;
    background: #fff;
  }
</style>
