<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import CopyCode from "$lib/components/CopyCode.svelte";

  const {
    name,
    label,
  }: {
    name: ThemeName;
    label: string;
  } = $props();

  const rows = [
    { release: 1, response: 18, group: "North" },
    { release: 2, response: 31, group: "North" },
    { release: 3, response: 43, group: "North" },
    { release: 4, response: 56, group: "North" },
    { release: 1, response: 27, group: "South" },
    { release: 2, response: 39, group: "South" },
    { release: 3, response: 52, group: "South" },
    { release: 4, response: 68, group: "South" },
  ];
  const code = $derived(
    `<GGPlot data={rows} aes={{ x: "release", y: "response", color: "group" }} theme="${name}">\n  <GeomPoint size={3.5} />\n</GGPlot>`,
  );
</script>

<article>
  <header>
    <div>
      <p>Built-in chart theme</p>
      <h3>{label}</h3>
    </div>
    <code>{name}</code>
  </header>
  <div class="plot-paper">
    <GGPlot
      data={rows}
      aes={{ x: "release", y: "response", color: "group" }}
      theme={name}
      height={230}
      ariaLabel={`${label} theme applied to the controlled release and response chart`}
    >
      <GeomPoint size={3.5} />
    </GGPlot>
  </div>
  <p class="fragment-label">Svelte fragment</p>
  <CopyCode {code} label={`Copy ${label} theme code`} />
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

  header > code {
    color: var(--muted);
    font-size: 0.72rem;
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
