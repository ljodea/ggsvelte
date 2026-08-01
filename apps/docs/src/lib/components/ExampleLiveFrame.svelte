<script lang="ts">
  /**
   * Example detail frame: paint the gallery PNG first, then upgrade to the
   * live Example.svelte chart only after user intent (hover/focus) so SPA nav
   * and scroll stay responsive. Near-viewport auto-upgrade pulled the full
   * chart stack as soon as a specimen approached the fold.
   *
   * `?vr` forces an immediate upgrade so visual regression can wait on
   * `.gg-plot-root[data-gg-ready]` without racing intent handlers.
   */
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import type { Component } from "svelte";

  import { loadExampleComponent } from "$lib/examples";
  import { observeUserIntent } from "$lib/load-on-intent";

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
  // settles). onMount still owns intent-gated upgrades for normal visits.
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
    const stop = observeUserIntent(el, startLoad);
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
  tabindex="0"
  role="group"
  aria-label={`${title} (hover or focus to load the interactive chart)`}
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

  .gg-example-frame:focus-visible {
    outline: 2px solid var(--ink, #111);
    outline-offset: 4px;
  }

  .example-preview {
    display: block;
    width: 100%;
    height: auto;
    background: #fff;
  }
</style>
