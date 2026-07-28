<script lang="ts">
  import {
    GeomCol,
    GGPlot,
    Guides,
    Labs,
    Scale,
    Theme,
  } from "@ggsvelte/svelte";
  import type { CATEGORICAL_SCHEME_NAMES, ThemeName } from "@ggsvelte/spec";
  import { onMount } from "svelte";

  import { observeNearViewport } from "$lib/near-viewport";
  import { languages } from "$lib/theme-specimens/data";

  type CategoricalSchemeName = (typeof CATEGORICAL_SCHEME_NAMES)[number];

  const {
    name,
    label,
    colors,
    capacity,
    reverse,
    paperTheme,
  }: {
    name: CategoricalSchemeName;
    label: string;
    colors: readonly string[];
    capacity: number;
    reverse: boolean;
    paperTheme: ThemeName;
  } = $props();

  const displayColors = $derived(reverse ? colors.toReversed() : colors);
  const plotHeight = 340;

  /** Mount the live plot only near the viewport (#1037). */
  let root = $state<HTMLElement | undefined>();
  let active = $state(false);

  onMount(() => {
    const el = root;
    if (el === undefined) return;
    return observeNearViewport(el, () => {
      active = true;
    });
  });
</script>

<article class="specimen" bind:this={root}>
  <header>
    <div>
      <h3>{label}</h3>
      <span class="capacity">{capacity} colors</span>
    </div>
  </header>

  <ul class="swatches" aria-label={`${label} ordered colors`}>
    {#each displayColors as color, index (`${color}-${String(index)}`)}
      <li
        style={`--swatch:${color}`}
        title={color}
        aria-label={`${String(index + 1)}: ${color}`}
      >
        <span aria-hidden="true"></span>
      </li>
    {/each}
  </ul>

  <div class="plot-panel" style:min-height="{plotHeight}px">
    {#if active}
      <GGPlot
        data={languages}
        aes={{ x: "language", y: "respondents", fill: "language" }}
        inspect={{ mode: "exact" }}
        height={plotHeight}
        ariaLabel={`${label} palette on ${paperTheme} paper`}
      >
        <Theme name={paperTheme} />
        <Scale value={{ fill: { type: "ordinal", scheme: name, reverse } }} />
        <Guides value={{ fill: { type: "none" } }} />
        <Labs
          title="Spanish Armada squadron tonnage, 1588"
          x="Squadron"
          y="Tons"
        />
        <GeomCol width={0.75} />
      </GGPlot>
    {:else}
      <div
        class="plot-placeholder"
        style:height="{plotHeight}px"
        aria-hidden="true"
      ></div>
    {/if}
  </div>
</article>

<style>
  .specimen {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  header {
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
  }

  .capacity {
    display: block;
    margin-top: 0.2rem;
    color: var(--muted);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }

  .swatches {
    display: flex;
    width: min(100%, 52rem);
    min-width: 0;
    margin: 0;
    padding: 0;
    overflow-x: auto;
    list-style: none;
    gap: 2px;
  }

  .swatches li {
    flex: 1 1 0;
    min-width: 1.25rem;
  }

  .swatches span {
    display: block;
    height: 1.5rem;
    background: var(--swatch);
  }

  .plot-panel {
    width: min(100%, 52rem);
    min-width: 0;
  }

  .plot-placeholder {
    width: 100%;
    border-radius: 0.25rem;
    background: color-mix(in srgb, var(--line) 55%, transparent);
  }
</style>
