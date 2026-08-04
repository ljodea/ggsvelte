<script lang="ts">
  import { onMount } from "svelte";

  import { observeUserIntent } from "$lib/load-on-intent";

  /**
   * Homepage grammar chart: static SVG shell until the user engages
   * (hover/focus). Auto-import on mount pulled the full chart stack and locked
   * the homepage for seconds. Copy and step accordion live in the parent
   * code-path section — this component is the chart only.
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
  let loadStarted = false;

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
  {/if}
</div>

<style>
  .grammar-output {
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
</style>
