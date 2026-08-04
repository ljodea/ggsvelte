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

  function ensureLive(): void {
    if (loadStarted || Plot !== null) return;
    loadStarted = true;
    void import("$lib/components/GrammarDemoPlot.svelte").then((mod) => {
      Plot = mod.default;
    });
  }

  onMount(() => {
    const el = host;
    if (el === null) return;
    return observeUserIntent(el, ensureLive);
  });
</script>

<div class="grammar-output" bind:this={host}>
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
