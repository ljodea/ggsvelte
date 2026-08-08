<script lang="ts">
  import {
    CoordFixed,
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
  import type { PlotInspectionChange } from "@ggsvelte/svelte";

  import {
    campaignRivers,
    minardCityLabels,
    minardCold,
    minardStrengthLabels,
    minardTroops,
  } from "./data.js";
  import { coldStripTooltipFields, mapMarchTooltipFields } from "./tooltip.js";

  type Inspection = PlotInspectionChange<Record<string, unknown>, PropertyKey>;
</script>

{#snippet tip(fields: { label: string; value: string }[])}
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

{#snippet mapTooltip(inspection: Inspection)}
  {@render tip(mapMarchTooltipFields(inspection.focus.row ?? {}))}
{/snippet}

{#snippet coldTooltip(inspection: Inspection)}
  {@render tip(coldStripTooltipFields(inspection.focus.row ?? {}))}
{/snippet}

<div class="minard">
  <GGPlot width="container" height={520}>
    <GeomPath
      data={campaignRivers}
      aes={{ x: "long", y: "lat", group: "river", color: { value: "#8fa8c0" } }}
      linewidth={0.8}
      alpha={0.7}
      inspect={false}
    />
    <GeomPath
      data={minardTroops}
      aes={{
        x: "long",
        y: "lat",
        group: "leg",
        color: "direction",
        linewidth: "survivors",
      }}
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
    <Inspect mode="xy" pin maxDistance={24} content={mapTooltip} />
  </GGPlot>

  <GGPlot data={minardCold} width="container" height={190}>
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
      subtitle="Temperature on the retreat, degrees Réaumur — dates as Minard marked them"
      x="Longitude east"
      y="°Réaumur"
    />
    <Inspect mode="xy" pin maxDistance={24} content={coldTooltip} />
  </GGPlot>
</div>

<style>
  .minard {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    /* fullWidth frame + container-width plots: fill the shell so live
       matches the stretched gallery PNG instead of snapping to a fixed px. */
    width: 100%;
    min-width: 0;
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
