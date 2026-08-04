<script lang="ts">
  import { onMount } from "svelte";

  import { observeUserIntent } from "$lib/load-on-intent";

  /**
   * Homepage grammar chart: static SVG shell until the user engages
   * (hover/focus or the explicit load button). Auto-import on mount pulled the
   * full chart stack and locked the homepage for seconds. Parent code-path
   * section owns the title and code tabs — this component is the chart only.
   *
   * The static SVG has no focusable nodes, so a "Load interactive chart"
   * button keeps a keyboard path after the old step accordion was removed.
   * After upgrade, focus is restored into .gg-capture so Tab does not jump to
   * document.body when the load button unmounts (#1362).
   */
  let {
    staticSvgLightSite,
    staticSvgDarkSite,
  }: {
    staticSvgLightSite: string;
    staticSvgDarkSite: string;
  } = $props();

  let host = $state<HTMLElement | null>(null);
  let Plot = $state<
    typeof import("$lib/components/GrammarDemoPlot.svelte").default | null
  >(null);
  let loadStarted = $state(false);
  /** True when the user tabbed into the shell; hand focus to .gg-capture on ready. */
  let restoreKeyboardFocus = $state(false);

  function ensureLive(): void {
    if (loadStarted || Plot !== null) return;
    loadStarted = true;
    void import("$lib/components/GrammarDemoPlot.svelte").then((mod) => {
      Plot = mod.default;
    });
  }

  function onShellFocusIn(): void {
    if (Plot === null) restoreKeyboardFocus = true;
  }

  function onShellFocusOut(event: FocusEvent): void {
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
      root.querySelector<HTMLElement>(".gg-plot-root");
    if (target === null) return false;
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

  onMount(() => {
    const el = host;
    if (el === null) return;
    return observeUserIntent(el, ensureLive);
  });

  // After keyboard-triggered upgrade, move focus into the plot so Tab order
  // does not jump to <body> when the load button unmounts (#1362).
  $effect(() => {
    if (Plot === null || host === null || !restoreKeyboardFocus) return;
    const root = host;
    const tryFocus = (): boolean => {
      if (!focusAfterUpgrade(root)) return false;
      restoreKeyboardFocus = false;
      return true;
    };
    if (tryFocus()) return;
    const mo = new MutationObserver(() => {
      if (tryFocus()) mo.disconnect();
    });
    mo.observe(root, { childList: true, subtree: true, attributes: true });
    const stop = window.setTimeout(() => {
      mo.disconnect();
      restoreKeyboardFocus = false;
    }, 30_000);
    return () => {
      mo.disconnect();
      window.clearTimeout(stop);
    };
  });
</script>

<div
  class="grammar-output"
  bind:this={host}
  onfocusin={onShellFocusIn}
  onfocusout={onShellFocusOut}
>
  {#if Plot !== null}
    <Plot />
  {:else}
    <!--
      theme.js sets data-theme before paint. Mirror contrastChartTheme():
      fivethirtyeight on the light site, light chart on dark — no theme flash.
    -->
    <div class="grammar-static grammar-static--light-site">
      {@html staticSvgLightSite}
    </div>
    <div class="grammar-static grammar-static--dark-site">
      {@html staticSvgDarkSite}
    </div>
    <!-- Stay mounted and focusable while the import resolves (no disabled blur). -->
    <button
      type="button"
      class="load-interactive"
      onclick={ensureLive}
      aria-disabled={loadStarted}
      aria-busy={loadStarted}
    >
      {loadStarted ? "Loading…" : "Load interactive chart"}
    </button>
  {/if}
</div>

<style>
  .grammar-output {
    position: relative;
    min-width: 0;
  }

  .grammar-output :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .grammar-static--dark-site {
    display: none;
  }

  :global(:root[data-theme="dark"]) .grammar-static--light-site {
    display: none;
  }

  :global(:root[data-theme="dark"]) .grammar-static--dark-site {
    display: block;
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
</style>
