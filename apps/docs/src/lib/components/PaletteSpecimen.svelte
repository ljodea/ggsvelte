<script lang="ts">
  import { base } from "$app/paths";
  import { onMount } from "svelte";
  import type { CATEGORICAL_SCHEME_NAMES, ThemeName } from "@ggsvelte/spec";

  import { observeNearViewport } from "$lib/near-viewport";

  type CategoricalSchemeName = (typeof CATEGORICAL_SCHEME_NAMES)[number];

  const {
    name,
    label,
    colors,
    capacity,
    reverse,
    paperTheme,
    staticSrc,
  }: {
    name: CategoricalSchemeName;
    label: string;
    colors: readonly string[];
    capacity: number;
    reverse: boolean;
    paperTheme: ThemeName;
    /** Path under /theme-shells/ for reverse=false + paperTheme=light. */
    staticSrc: string;
  } = $props();

  const plotHeight = 340;
  const displayColors = $derived(reverse ? colors.toReversed() : colors);
  /** Shell matches only the prerender defaults; other control combos need live. */
  const shellMatches = $derived(!reverse && paperTheme === "light");

  let host = $state<HTMLDivElement | null>(null);
  let Live = $state<
    typeof import("./PaletteSpecimenLive.svelte").default | null
  >(null);

  onMount(() => {
    const el = host;
    if (el === null) return;
    let cancelled = false;

    const load = (): void => {
      if (cancelled || Live !== null) return;
      void import("./PaletteSpecimenLive.svelte").then((mod) => {
        if (!cancelled) Live = mod.default;
      });
    };

    // Near-viewport only. Do not $effect-load every off-screen specimen when
    // reverse/paper toggles — that freezes the page. Live specimens already
    // upgrade via props; others load on scroll.
    const stop = observeNearViewport(el, load, { rootMargin: "480px 0px" });
    return () => {
      cancelled = true;
      stop();
    };
  });
</script>

<article class="specimen">
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

  <div class="plot-panel" bind:this={host} style:min-height="{plotHeight}px">
    {#if Live !== null}
      <Live {name} {label} {reverse} {paperTheme} height={plotHeight} />
    {:else if shellMatches}
      <img
        class="static-shell"
        src={`${base}${staticSrc}`}
        alt=""
        width="832"
        height={plotHeight}
        decoding="async"
        loading="lazy"
      />
    {:else}
      <div class="plot-shell" style:height={`${String(plotHeight)}px`}></div>
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

  .plot-panel :global(svg),
  .static-shell {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .plot-panel {
    width: min(100%, 52rem);
    min-width: 0;
  }

  .plot-panel :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .plot-shell {
    width: 100%;
    background: var(--wash);
    border: 1px solid var(--line);
  }
</style>
