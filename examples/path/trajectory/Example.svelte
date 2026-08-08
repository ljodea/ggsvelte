<script lang="ts">
  import {
    CoordFixed,
    createPlotInteraction,
    GeomPath,
    GeomPoint,
    GeomText,
    GGPlot,
    Inspect,
    Labs,
    ScaleColorManual,
    ScaleLinewidthContinuous,
    ScaleXContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";
  import type { PlotInspection, PlotInspectionChange } from "@ggsvelte/svelte";

  import {
    campaignRivers,
    minardCityLabels,
    minardColdStations,
    minardStrengthLabels,
    minardTroopsWithCold,
  } from "./data.js";
  import {
    coldStripTooltipFields,
    mapMarchTooltipFields,
    mapRowIdentity,
    stationKeyFromInspectRow,
  } from "./tooltip.js";

  // Inspect-driven linked selection (no Select-point tool → no dual-tool chrome).
  // oninspect publishes stationKey; both plots passively paint selection rings.
  // Selection is sticky: only update when a cold station is in focus. Inspect
  // clear / advance vertices must not wipe the ring — otherwise moving to the
  // other chart to look at the highlight erases it.
  const interaction = createPlotInteraction<string>();
  const scope = { keys: "minard-cold-station" } as const;

  function syncStationSelection(
    event: PlotInspection<Record<string, unknown>, PropertyKey>,
  ): void {
    if (event.phase === "clear") return;
    const key = stationKeyFromInspectRow(
      event.focus.row as Record<string, unknown> | null,
    );
    if (key === null) return;
    interaction.setSelection([key], { scope, source: "programmatic" });
  }
</script>

{#snippet mapTooltip(
  inspection: PlotInspectionChange<Record<string, unknown>, PropertyKey>,
)}
  {@const fields = mapMarchTooltipFields(
    (inspection.focus.row ?? {}) as {
      survivors?: unknown;
      date?: unknown;
    },
  )}
  {#if fields.length > 0}
    <dl class="minard-tip">
      {#each fields as field (field.label)}
        <div>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      {/each}
    </dl>
  {/if}
{/snippet}

{#snippet coldTooltip(
  inspection: PlotInspectionChange<Record<string, unknown>, PropertyKey>,
)}
  {@const fields = coldStripTooltipFields(
    (inspection.focus.row ?? {}) as {
      temp?: unknown;
      date?: unknown;
    },
  )}
  {#if fields.length > 0}
    <dl class="minard-tip">
      {#each fields as field (field.label)}
        <div>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      {/each}
    </dl>
  {/if}
{/snippet}

<div class="minard">
  <GGPlot
    width={960}
    height={520}
    {interaction}
    interactionScope={scope}
    oninspect={syncStationSelection}
  >
    <GeomPath
      data={campaignRivers}
      aes={{ x: "long", y: "lat", group: "river", color: { value: "#8fa8c0" } }}
      linewidth={0.8}
      alpha={0.7}
      inspect={false}
    />
    <!-- Stamped cold dates/stationKey on retreat vertices for pin + link -->
    <GeomPath
      data={minardTroopsWithCold}
      aes={{
        x: "long",
        y: "lat",
        group: "leg",
        color: "direction",
        linewidth: "survivors",
      }}
    />
    <!-- Quiet ring anchors only (not a second figurative series). Station keys
         live here; path vertices keep unique non-link identity. -->
    <GeomPoint
      data={minardColdStations}
      aes={{
        x: "long",
        y: "lat",
        color: { value: "#25221e" },
      }}
      size={1.75}
      alpha={0.4}
    />
    <GeomText
      data={minardCityLabels}
      aes={{ x: "lx", y: "ly", label: "city", color: { value: "#4a4237" } }}
      size={10}
      dy={-9}
      inspect={false}
    />
    <GeomText
      data={minardStrengthLabels}
      aes={{ x: "long", y: "lat", label: "count", color: { value: "#6b5d4a" } }}
      size={9}
      inspect={false}
    />
    <!-- lon/lat degrees are not the same length on the ground at 55°N -->
    <CoordFixed ratio={1.6} />
    <ScaleXContinuous limits={[23.5, 38.2]} />
    <!-- legends below the panel so both plots keep the same full-width x axis -->
    <ScaleColorManual
      domain={["Advance", "Retreat"]}
      values={["#d3a05e", "#25221e"]}
      guide={{ type: "legend", position: "bottom" }}
    />
    <ScaleLinewidthContinuous
      range={[1, 18]}
      guide={{ type: "legend", position: "bottom" }}
    />
    <ThemeClassic />
    <Labs
      title="The Grande Armée's march to Moscow and back, 1812–13"
      subtitle="Band width is the number of men still with the column — after Minard's 1869 figurative map"
      x=""
      y=""
      color=""
      linewidth="Survivors"
    />
    <Inspect
      mode="xy"
      pin
      maxDistance={24}
      identity={mapRowIdentity}
      content={mapTooltip}
    />
  </GGPlot>

  <GGPlot
    data={minardColdStations}
    width={960}
    height={190}
    {interaction}
    interactionScope={scope}
    oninspect={syncStationSelection}
  >
    <GeomPath
      aes={{ x: "long", y: "temp", color: { value: "#6b7280" } }}
      linewidth={1.5}
    />
    <GeomPoint
      aes={{ x: "long", y: "temp", color: { value: "#374151" } }}
      size={2.5}
    />
    <GeomText
      aes={{ x: "long", y: "temp", label: "date", color: { value: "#374151" } }}
      size={10}
      dy={-11}
      inspect={false}
    />
    <ScaleXContinuous limits={[23.5, 38.2]} />
    <ThemeClassic />
    <Labs
      title="The cold on the road back"
      subtitle="Temperature on the retreat, degrees Réaumur — pin a reading to mark the same station on the map"
      x="Longitude east"
      y="°Réaumur"
    />
    <Inspect
      mode="xy"
      pin
      maxDistance={24}
      identity="stationKey"
      content={coldTooltip}
    />
  </GGPlot>
</div>

<style>
  .minard {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .minard-tip {
    margin: 0;
    display: grid;
    gap: 0.2rem;
    font: 0.8rem/1.3 var(--gg-font-family, system-ui, sans-serif);
  }

  .minard-tip div {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35rem 0.65rem;
    align-items: baseline;
  }

  .minard-tip dt {
    margin: 0;
    color: var(--muted, #59636e);
    font-weight: 600;
  }

  .minard-tip dd {
    margin: 0;
    color: var(--fg, #17202a);
  }
</style>
