<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { ridership } from "./data.js";

  let status = $state(
    "All four modes are included. Toggle a checkbox to filter the grammar pipeline.",
  );
</script>

<div class="legend-filter-demo">
  <p class="status" role="status" aria-live="polite">{status}</p>
  <GGPlot
    data={ridership}
    aes={{ x: "month", y: "riders", color: "mode" }}
    key="id"
    legendFilter
    width="container"
    height={430}
    labs={{
      title: "Daily transit ridership",
      subtitle: "Filter any mode; restored groups keep their original color",
      x: "Month",
      y: "Daily riders (thousands)",
      color: "Mode",
    }}
    onlegendfilter={(event) => {
      status =
        event.phase === "clear" || event.clause === null
          ? "All modes restored. Color identity did not change."
          : `${String(event.clause.values.length)} ${event.clause.values.length === 1 ? "mode is" : "modes are"} hidden; the legend keeps every mode available.`;
    }}
  >
    <GeomLine linewidth={2.2} />
    <GeomPoint size={3.2} />
  </GGPlot>
  <p class="note">
    <strong>Why this is filtering:</strong> statistics, facets, and domains see
    only the visible rows. For visual comparison without changing data, use
    <code>legendFocus</code> instead.
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
    color: var(--text, #17202a);
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
    color: var(--text, #17202a);
  }
</style>
