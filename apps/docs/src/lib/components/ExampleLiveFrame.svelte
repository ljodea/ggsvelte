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

  function onShellFocusOut(event: FocusEvent): void {
    // User tabbed away while loading — do not snatch focus back on ready.
    // relatedTarget === null means blur from unmount (keep restore pending).
    const next = event.relatedTarget;
    if (next === null) return;
    if (next instanceof Node && host !== null && host.contains(next)) return;
    restoreKeyboardFocus = false;
  }

  function focusAfterUpgrade(root: HTMLElement): boolean {
    const capture = root.querySelector<HTMLElement>(".gg-capture");
    const target =
      capture ??
      root.querySelector<HTMLElement>('.gg-plot-root[data-gg-ready="true"]') ??
      root.querySelector<HTMLElement>(".gg-plot-root") ??
      root.querySelector<HTMLElement>(".live-host");
    if (target === null) return false;
    // Only restore when focus is still in this shell or was dropped to body.
    const active = document.activeElement;
    if (
      active !== null &&
      active !== document.body &&
      active !== document.documentElement &&
      !root.contains(active)
    ) {
      return true; // user moved on — clear without focusing
    }
    if (target.tabIndex < 0 && !target.hasAttribute("tabindex")) {
      target.tabIndex = -1;
    }
    queueMicrotask(() => {
      target.focus({ preventScroll: true });
    });
    return true;
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
  // READY_FALLBACK_MS: reveal even if the plot never reports ready (#1363).
  const READY_FALLBACK_MS = 10_000;
  $effect(() => {
    if (Live === null || host === null) {
      liveReady = false;
      return;
    }
    const root = host;
    const markReady = (): void => {
      liveReady = true;
    };
    const already = root.querySelector('.gg-plot-root[data-gg-ready="true"]');
    if (already !== null) {
      markReady();
      return;
    }
    liveReady = false;
    const observer = new MutationObserver(() => {
      if (root.querySelector('.gg-plot-root[data-gg-ready="true"]') !== null) {
        markReady();
        observer.disconnect();
      }
    });
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-gg-ready"],
      subtree: true,
      childList: true,
    });
    const fallback = window.setTimeout(markReady, READY_FALLBACK_MS);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  });

  // After keyboard-triggered upgrade, move focus into the plot so Tab order
  // does not jump to <body> when the load button unmounts (#1362).
  // Retry after READY_FALLBACK_MS reveals before the plot has a focus target.
  $effect(() => {
    if (!liveReady || host === null || !restoreKeyboardFocus) return;
    const root = host;
    if (focusAfterUpgrade(root)) {
      restoreKeyboardFocus = false;
      return;
    }
    const mo = new MutationObserver(() => {
      if (focusAfterUpgrade(root)) {
        restoreKeyboardFocus = false;
        mo.disconnect();
      }
    });
    mo.observe(root, { childList: true, subtree: true, attributes: true });
    const stop = window.setTimeout(() => {
      mo.disconnect();
      if (!restoreKeyboardFocus) return;
      focusAfterUpgrade(root);
      restoreKeyboardFocus = false;
    }, 15_000);
    return () => {
      mo.disconnect();
      window.clearTimeout(stop);
    };
  });
</script>

<div
  class="gg-example-frame"
  class:full-width={fullWidth}
  class:live-ready={liveReady}
  bind:this={host}
  onfocusin={onShellFocusIn}
  onfocusout={onShellFocusOut}
  style={`--example-vr-width:${String(width)}px;--example-vr-height:${String(height)}px`}
>
  {#if !liveReady}
    <!-- Keep the PNG in normal flow so the frame height stays real while the
         live host is absolutely positioned under it (#1363). -->
    <img
      class="example-preview"
      src={`${base}${previewPath}`}
      alt={title}
      {width}
      {height}
      decoding="async"
      fetchpriority="high"
    />
    <!-- Stay mounted and focusable while the import resolves (no disabled blur). -->
    <button
      type="button"
      class="load-interactive"
      onclick={startLoad}
      aria-disabled={Live !== null}
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
    /* No aspect-ratio: --example-vr-* are lengths (…px); aspect-ratio only
       accepts unitless numbers, and a permanent ratio fixed height so
       overflow:hidden clipped tool-rail / legend chrome. Size from the
       in-flow PNG instead; height grows with live content so app.css
       overflow:hidden only clips horizontal overflow on narrow screens (#1363). */
  }

  .gg-example-frame.full-width {
    max-width: none;
  }

  /* Fixed-width example SVGs can exceed the frame on narrow viewports; keep
     them inside the (overflow:hidden) frame without horizontal page scroll. */
  .live-host :global(.gg-plot-root),
  .live-host :global(svg) {
    max-width: 100%;
  }

  .example-preview {
    display: block;
    width: 100%;
    height: auto;
    background: #fff;
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
  }

  .live-host:not(.revealed) {
    /* Overlay the in-flow PNG while the plot measures; do not contribute height. */
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
