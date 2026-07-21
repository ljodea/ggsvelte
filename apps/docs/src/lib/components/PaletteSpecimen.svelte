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
    `<GGPlot\n  data={rows}\n  aes={{ x: "signal", y: "value", color: "category" }}\n  scales={{ color: { scheme: "${name}", reverse: ${String(reverse)} } }}\n  theme="${paperTheme}"\n>\n  <GeomPoint size={4} />\n</GGPlot>`,
  );
</script>

<article>
  <header>
    <div>
      <p>Named categorical scheme</p>
      <h3>{label}</h3>
    </div>
    <strong>{capacity} colors</strong>
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

  <div class="plot-paper">
    <GGPlot
      data={rows}
      aes={{ x: "signal", y: "value", color: "category" }}
      scales={{ color: { type: "ordinal", scheme: name, reverse } }}
      theme={paperTheme}
      height={245}
      ariaLabel={`${label} categorical color scheme on ${paperTheme} chart paper`}
    >
      <GeomPoint size={4} />
    </GGPlot>
  </div>

  <p class="fragment-label">Svelte fragment</p>
  <CopyCode
    {code}
    language="svelte"
    accessibleLabel={`Copy ${label} palette code`}
  />
</article>

<style>
  article {
    min-width: 0;
    height: 100%;
    border: 1px solid var(--line);
    background: var(--paper);
  }

  header {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
  }

  header p,
  .fragment-label {
    margin: 0;
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h3 {
    margin: 0.2rem 0 0;
    font-size: 1.4rem;
  }

  header strong {
    color: var(--muted);
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .swatches {
    display: flex;
    min-width: 0;
    margin: 0;
    padding: 0 1rem 1rem;
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
    border: 1px solid color-mix(in srgb, var(--swatch), #000 18%);
    background: var(--swatch);
  }

  .swatches code {
    color: var(--muted);
    font-size: 0.6rem;
  }

  .plot-paper {
    min-width: 0;
    overflow: hidden;
    border-block: 1px solid var(--line);
  }

  .fragment-label {
    padding: 0.75rem 1rem 0;
  }

  :global(.copy-code) {
    margin: 0.5rem 1rem 1rem;
  }
</style>
