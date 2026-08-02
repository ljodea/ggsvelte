<script lang="ts">
  /**
   * Example detail frame: paint the gallery PNG first, then upgrade to the
   * live Example.svelte chart only after user intent (hover/focus/button) so
   * SPA nav and scroll stay responsive. Near-viewport auto-upgrade pulled the
   * full chart stack as soon as a specimen approached the fold.
   *
   * The static shell stays mounted (and sized) until the live plot reports
   * `data-gg-ready="true"`, so users never see an 18×18 icon SVG flash before
   * the full 640×400 plot.
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
  let liveReady = $state(false);
  /** True when the user tabbed into the shell; hand focus to .gg-capture on ready. */
  let restoreKeyboardFocus = $state(false);
  let loadStarted = false;
  let cancelled = false;

  function startLoad(): void {
    if (loadStarted || Live !== null) return;
    loadStarted = true;
    void loadExampleComponent(exampleId).then((component) => {
      if (!cancelled) Live = component;
    });
  }

  function onShellFocusIn(): void {
    if (!liveReady) restoreKeyboardFocus = true;
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

  // When Live mounts, keep the shell until data-gg-ready flips true.
  $effect(() => {
    if (Live === null || host === null) {
      liveReady = false;
      return;
    }
    const root = host;
    const already = root.querySelector('.gg-plot-root[data-gg-ready="true"]');
    if (already !== null) {
      liveReady = true;
      return;
    }
    liveReady = false;
    const observer = new MutationObserver(() => {
      if (root.querySelector('.gg-plot-root[data-gg-ready="true"]') !== null) {
        liveReady = true;
        observer.disconnect();
      }
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-gg-ready"],
      subtree: true,
      childList: true,
    });
    return () => observer.disconnect();
  });

  // After keyboard-triggered upgrade, move focus into the plot so Tab order
  // does not jump to <body> when the load button unmounts (#1362).
  $effect(() => {
    if (!liveReady || host === null || !restoreKeyboardFocus) return;
    const capture = host.querySelector<HTMLElement>(".gg-capture");
    if (capture === null) return;
    restoreKeyboardFocus = false;
    queueMicrotask(() => {
      capture.focus({ preventScroll: true });
    });
  });
</script>

<div
  class="gg-example-frame"
  class:full-width={fullWidth}
  class:live-ready={liveReady}
  bind:this={host}
  onfocusin={onShellFocusIn}
  style={`--example-vr-width:${String(width)}px;--example-vr-height:${String(height)}px`}
>
  {#if !liveReady}
    <img
      class="example-preview"
      class:under-live={Live !== null}
      src={`${base}${previewPath}`}
      alt={title}
      {width}
      {height}
      decoding="async"
      fetchpriority="high"
    />
    <!-- Stay mounted while the import resolves so keyboard focus has a home. -->
    <button
      type="button"
      class="load-interactive"
      onclick={startLoad}
      disabled={Live !== null}
      aria-busy={Live !== null}
    >
      {Live === null ? "Load interactive chart" : "Loading…"}
    </button>
  {/if}
  {#if Live !== null}
    <div class="live-host" class:revealed={liveReady}>
      <Live />
    </div>
  {/if}
</div>

<style>
  .gg-example-frame {
    position: relative;
    margin: 2.5rem 0;
    width: 100%;
    max-width: var(--example-vr-width);
    min-width: 0;
    /* Reserve the live plot box so layout does not jump while the shell upgrades. */
    aspect-ratio: var(--example-vr-width) / var(--example-vr-height);
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

  .example-preview.under-live {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    z-index: 1;
  }

  .load-interactive {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
    z-index: 2;
    margin: 0;
    padding: 0.4rem 0.7rem;
    border: 1px solid var(--line, #ccc);
    border-radius: 0.35rem;
    background: color-mix(in srgb, var(--paper, #fff) 92%, transparent);
    color: var(--ink, #111);
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .load-interactive:focus-visible {
    outline: 2px solid var(--ink, #111);
    outline-offset: 2px;
  }

  .live-host {
    width: 100%;
    height: 100%;
  }

  .live-host:not(.revealed) {
    /* Keep the plot in the layout tree so it can measure, but hide the flash. */
    position: absolute;
    inset: 0;
    opacity: 0;
    pointer-events: none;
    z-index: 0;
  }

  .live-host.revealed {
    position: relative;
    opacity: 1;
  }
</style>
