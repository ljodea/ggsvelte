<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import CopyCode from "$lib/components/CopyCode.svelte";

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

  const rows = [
    { signal: 1, value: 22, category: "Alpha" },
    { signal: 2, value: 37, category: "Beta" },
    { signal: 3, value: 29, category: "Gamma" },
    { signal: 4, value: 55, category: "Delta" },
    { signal: 5, value: 46, category: "Epsilon" },
  ];
  const displayColors = $derived(reverse ? colors.toReversed() : colors);
  const code = $derived(
    `<GGPlot
  data={rows}
  aes={{ x: "signal", y: "value", color: "category" }}
  scales={{ color: { scheme: "${name}", reverse: ${String(reverse)} } }}
  theme="${paperTheme}"
>
  <GeomPoint size={4} />
</GGPlot>`,
  );
</script>

<article>
  <header>
    <div>
      <h3>{label}</h3>
      <code>scheme="{name}"</code>
    </div>
    <span class="capacity">{capacity} colors</span>
  </header>

  <ul class="swatches" aria-label={`${label} ordered colors`}>
    {#each displayColors as color, index (`${color}-${String(index)}`)}
      <li
        style={`--swatch:${color}`}
        aria-label={`${String(index + 1)}: ${color}`}
      >
        <span aria-hidden="true"></span><code>{color}</code>
      </li>
    {/each}
  </ul>

  <div class="plot">
    <GGPlot
      data={rows}
      aes={{ x: "signal", y: "value", color: "category" }}
      scales={{ color: { type: "ordinal", scheme: name, reverse } }}
      theme={paperTheme}
      height={260}
      ariaLabel={`${label} palette on ${paperTheme} paper`}
    >
      <GeomPoint size={4} />
    </GGPlot>
  </div>

  <CopyCode
    {code}
    language="svelte"
    accessibleLabel={`Copy ${label} palette code`}
  />
</article>

<style>
  article {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
  }

  header code {
    display: block;
    margin-top: 0.2rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .capacity {
    color: var(--muted);
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .swatches {
    display: flex;
    min-width: 0;
    margin: 0;
    padding: 0;
    overflow-x: auto;
    list-style: none;
  }

  .swatches li {
    display: grid;
    flex: 0 0 3.5rem;
    gap: 0.35rem;
  }

  .swatches span {
    display: block;
    height: 1.5rem;
    background: var(--swatch);
  }

  .swatches code {
    color: var(--muted);
    font-size: 0.6rem;
  }

  .plot {
    min-width: 0;
  }
</style>
