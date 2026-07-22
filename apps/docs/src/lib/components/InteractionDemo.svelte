<script lang="ts">
  import { createPlotInteraction, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import CopyCode from "$lib/components/CopyCode.svelte";

  const rows = [
    { id: "a-1", period: 1, value: 24, series: "Alpha" },
    { id: "a-2", period: 2, value: 38, series: "Alpha" },
    { id: "a-3", period: 3, value: 52, series: "Alpha" },
    { id: "b-1", period: 1, value: 42, series: "Beta" },
    { id: "b-2", period: 2, value: 31, series: "Beta" },
    { id: "b-3", period: 3, value: 61, series: "Beta" },
    { id: "c-1", period: 1, value: 57, series: "Gamma" },
    { id: "c-2", period: 2, value: 69, series: "Gamma" },
    { id: "c-3", period: 3, value: 76, series: "Gamma" },
  ];
  const scope = {
    keys: "interaction-demo-rows",
    x: "interaction-demo-x",
    y: "interaction-demo-y",
  } as const;
  const interaction = createPlotInteraction<string>();
  const emphasized = $derived(interaction.emphasized(scope));
  // Interval brush stores keys on intervals(), not selected().
  const selectedCount = $derived(
    new Set(interaction.intervals(scope).flatMap((interval) => interval.keys))
      .size,
  );
  let status = $state(
    "Inspect a point, select a region, or focus a legend series.",
  );

  const closeScript = ["</", "script>"].join("");
  const code = `<script lang="ts">
  import { createPlotInteraction, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  const interaction = createPlotInteraction<string>();
  const scope = { keys: "rows", x: "x", y: "y" } as const;
${closeScript}

<GGPlot
  {interaction}
  interactionScope={scope}
  data={rows}
  key="id"
  aes={{ x: "period", y: "value", color: "series" }}
  inspect
  legendFocus
  select={{ type: "interval", mode: "xy" }}
  zoom={{ mode: "x" }}
>
  <GeomPoint size={4} />
</GGPlot>`;

  function describeLegend(event: {
    phase: "change" | "clear";
    state?: string;
    label?: string;
    keys?: readonly string[];
  }): void {
    status =
      event.phase === "clear"
        ? "Legend emphasis cleared."
        : `${event.label ?? "Series"} ${event.state === "committed" ? "pinned" : "previewed"}; ${String(event.keys?.length ?? 0)} rows.`;
  }

  function clearShared(): void {
    interaction.clearSelection({ scope, source: "programmatic" });
    interaction.clearEmphasis({ scope, source: "programmatic" });
    interaction.clearIntervals({ scope, source: "programmatic" });
    interaction.resetZoom({ scope, source: "programmatic" });
    status = "Selection, emphasis, and zoom cleared.";
  }
</script>

<section class="interaction-demo" aria-label="Interaction demo">
  <div class="plot">
    <GGPlot
      data={rows}
      aes={{ x: "period", y: "value", color: "series" }}
      layers={[{ geom: "point", params: { size: 4 } }]}
      scales={{ color: { type: "ordinal", scheme: "observable10" } }}
      key="id"
      inspect
      select={{ type: "interval", mode: "xy" }}
      zoom={{ mode: "x" }}
      legendFocus
      {interaction}
      interactionScope={scope}
      height={420}
      labs={{ x: "Period", y: "Value", color: "Series" }}
      ariaLabel="Interactive series with inspect, select, zoom, and legend focus"
      onlegendfocus={describeLegend}
    >
      <GeomPoint size={4} />
    </GGPlot>
  </div>

  <div class="status">
    <div>
      <strong>{emphasized.length} emphasized · {selectedCount} selected</strong>
      <span role="status">{status}</span>
    </div>
    <button type="button" onclick={clearShared}>Clear</button>
  </div>

  <CopyCode
    {code}
    language="svelte"
    accessibleLabel="Copy interaction example code"
  />
</section>

<style>
  .interaction-demo {
    display: grid;
    gap: 1rem;
    min-width: 0;
    max-width: 48rem;
  }

  .plot {
    min-width: 0;
  }

  .status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .status > div {
    display: grid;
    gap: 0.15rem;
  }

  .status span {
    color: var(--muted);
    font-size: 0.82rem;
  }

  button {
    min-height: 44px;
    padding: 0.55rem 0.85rem;
    border: 1px solid var(--line-strong, var(--line));
    border-radius: 2px;
    background: var(--paper);
    color: var(--ink);
    font: 600 0.82rem/1 var(--body-font);
  }

  @media (max-width: 38rem) {
    .status {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
