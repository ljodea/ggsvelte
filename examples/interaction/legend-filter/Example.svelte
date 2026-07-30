<script lang="ts">
  import {
    GeomLine,
    GeomPoint,
    GGPlot,
    GuideLegend,
    Labs,
    ScaleXContinuous,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { britishFinances } from "./data.js";

  let status = $state(
    "All three series are included. Toggle a checkbox to filter the grammar pipeline.",
  );
</script>

<div class="legend-filter-demo">
  <p class="status gg-demo-chrome" role="status" aria-live="polite">{status}</p>
  <GGPlot
    data={britishFinances}
    aes={{ x: "year", y: "value", color: "series" }}
    key="id"
    width="container"
    height={430}
    onlegendfilter={(event) => {
      status =
        event.phase === "clear" || event.clause === null
          ? "All series restored. Color identity did not change."
          : `${String(event.clause.values.length)} ${event.clause.values.length === 1 ? "series is" : "series are"} hidden; the legend keeps every series available.`;
    }}
  >
    <ThemeFivethirtyeight />
    <ScaleXContinuous labels="d" />
    <Labs
      title="Playfair's fiscal three, 1770–1824"
      subtitle="Filter any series; restored groups keep their original color"
      x="Year"
      y="Playfair's index units"
      color="Series"
    />
    <GuideLegend channel="color" filter />
    <GeomLine linewidth={2.2} />
    <GeomPoint size={3.2} />
  </GGPlot>
  <p class="note gg-demo-chrome">
    <strong>Why this is filtering:</strong> statistics, facets, and domains see
    only the visible rows. For visual comparison without changing data, use
    <code>&lt;GuideLegend focus /&gt;</code> instead.
  </p>
</div>

<style>
  .legend-filter-demo {
    display: grid;
    gap: 0.8rem;
  }

  .status,
  .note {
    margin: 0;
    color: inherit;
    font: 0.86rem/1.45 var(--gg-font-family, system-ui, sans-serif);
  }

  .status {
    border-inline-start: 3px solid var(--accent, #2c7fb8);
    padding: 0.55rem 0.75rem;
    background: color-mix(in srgb, var(--accent, #2c7fb8) 7%, transparent);
  }

  .note {
    color: var(--muted, #59636e);
  }

  code {
    color: inherit;
  }
</style>
