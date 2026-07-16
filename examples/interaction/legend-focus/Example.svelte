<script lang="ts">
  import { createPlotInteraction, GGPlot } from "@ggsvelte/svelte";

  import { rows } from "./data.js";

  const scope = { keys: "legend-focus-rows" } as const;
  const mapping = { x: "x", y: "y", color: "group" } as const;
  const interaction = createPlotInteraction<string>();
  const emphasized = $derived(interaction.emphasized(scope));
  let status = $state(
    "Hover a legend entry to preview. Click, tap, Enter, or Space to pin it.",
  );

  function describe(event: {
    phase: "change" | "clear";
    state?: "transient" | "committed";
    label?: string;
    keys?: readonly string[];
    source: string;
  }): void {
    status =
      event.phase === "clear"
        ? `Legend focus cleared by ${event.source}.`
        : `${event.label} ${event.state === "committed" ? "pinned across three views" : "previewed here"}; ${String(event.keys?.length ?? 0)} rows.`;
  }
</script>

<div class="legend-focus-demo">
  <p class="status" role="status" aria-live="polite">{status}</p>
  <div class="plots">
    <GGPlot
      data={rows}
      aes={mapping}
      layers={[{ geom: "point", params: { size: 4 } }]}
      key="id"
      legendFocus
      {interaction}
      interactionScope={scope}
      width="container"
      height={310}
      labs={{ title: "SVG points", x: "Time", y: "Value", color: "Group" }}
      onlegendfocus={describe}
    />
    <GGPlot
      data={rows}
      aes={mapping}
      layers={[{ geom: "point", render: "canvas", params: { size: 4 } }]}
      key="id"
      legendFocus
      {interaction}
      interactionScope={scope}
      width="container"
      height={310}
      labs={{ title: "Canvas points", x: "Time", y: "Value", color: "Group" }}
      onlegendfocus={describe}
    />
    <GGPlot
      data={rows}
      aes={mapping}
      layers={[{ geom: "line", params: { linewidth: 2 } }, { geom: "point" }]}
      key="id"
      legendFocus
      {interaction}
      interactionScope={scope}
      width="container"
      height={310}
      labs={{ title: "SVG lines", x: "Time", y: "Value", color: "Group" }}
      onlegendfocus={describe}
    />
  </div>
  <div class="summary">
    <strong>{emphasized.length} rows focused</strong>
    <button
      type="button"
      disabled={emphasized.length === 0}
      onclick={() =>
        interaction.clearEmphasis({ scope, source: "programmatic" })}
      >Clear from ordinary Svelte UI</button
    >
  </div>
</div>

<style>
  .legend-focus-demo {
    display: grid;
    gap: 1rem;
  }

  .plots {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
  }

  .status,
  .summary {
    margin: 0;
    color: var(--text, #17202a);
    font: 0.86rem/1.4 var(--gg-font-family, system-ui, sans-serif);
  }

  .summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0.9rem;
    border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
    border-radius: 0.5rem;
  }

  button {
    min-height: 2.25rem;
    border: 1px solid color-mix(in srgb, currentColor 28%, transparent);
    border-radius: 0.4rem;
    padding: 0.4rem 0.7rem;
    background: var(--surface, white);
    color: inherit;
    font: inherit;
  }

  @media (max-width: 900px) {
    .plots {
      grid-template-columns: 1fr;
    }
  }
</style>
