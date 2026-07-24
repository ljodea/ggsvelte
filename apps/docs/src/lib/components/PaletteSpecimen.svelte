<script lang="ts">
  import { GeomCol, GGPlot } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import { languages } from "$lib/theme-specimens/data";

  const {
    name,
    label,
    colors,
    capacity,
    reverse,
    paperTheme,
  }: {
    name: "observable10" | "ipsum" | "flexoki" | "tableau10" | "colorblind";
    label: string;
    colors: readonly string[];
    capacity: number;
    reverse: boolean;
    paperTheme: ThemeName;
  } = $props();

  const displayColors = $derived(reverse ? colors.toReversed() : colors);
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

  <div class="plot-panel">
    <GGPlot
      data={languages}
      aes={{ x: "language", y: "respondents", fill: "language" }}
      scales={{ fill: { type: "ordinal", scheme: name, reverse } }}
      guides={{ fill: { type: "none" } }}
      theme={paperTheme}
      labs={{
        title: "Survey respondents by language",
        x: "Language",
        y: "Respondents",
      }}
      inspect={{ mode: "xy" }}
      height={340}
      ariaLabel={`${label} palette on ${paperTheme} paper`}
    >
      <GeomCol width={0.75} />
    </GGPlot>
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
</style>
