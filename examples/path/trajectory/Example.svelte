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

  import {
    campaignRivers,
    minardCityLabels,
    minardCold,
    minardColdStations,
    minardStrengthLabels,
    minardTroopsWithCold,
  } from "./data.js";
</script>

<div class="minard">
  <GGPlot width={960} height={520}>
    <Inspect mode="xy" pin maxDistance={24} />
    <ThemeClassic />
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
    <Labs
      title="The Grande Armée's march to Moscow and back, 1812–13"
      subtitle="Band width is the number of men still with the column — after Minard's 1869 figurative map"
      x=""
      y=""
      color=""
      linewidth="Survivors"
    />
    <GeomPath
      data={campaignRivers}
      aes={{ x: "long", y: "lat", group: "river", color: { value: "#8fa8c0" } }}
      linewidth={0.8}
      alpha={0.7}
      inspect={false}
    />
    <!-- label: "date" is tooltip-only on path (no text marks); empty away from cold stations -->
    <GeomPath
      data={minardTroopsWithCold}
      aes={{
        x: "long",
        y: "lat",
        group: "leg",
        color: "direction",
        linewidth: "survivors",
        label: "date",
      }}
    />
    <!-- Cold stations: easy pin targets with date first in the default tooltip -->
    <GeomPoint
      data={minardColdStations}
      aes={{
        x: "long",
        y: "lat",
        color: "direction",
        label: "date",
      }}
      size={2.5}
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
  </GGPlot>

  <GGPlot width={960} height={190}>
    <Inspect mode="xy" pin maxDistance={24} />
    <ThemeClassic />
    <ScaleXContinuous limits={[23.5, 38.2]} />
    <Labs title="The cold on the road back" x="Longitude east" y="°Réaumur" />
    <GeomPath
      data={minardCold}
      aes={{ x: "long", y: "temp", color: { value: "#6b7280" } }}
      linewidth={1.5}
    />
    <GeomPoint
      data={minardCold}
      aes={{ x: "long", y: "temp", color: { value: "#374151" } }}
      size={2.5}
    />
    <GeomText
      data={minardCold}
      aes={{ x: "long", y: "temp", label: "date", color: { value: "#374151" } }}
      size={10}
      dy={-11}
      inspect={false}
    />
  </GGPlot>
</div>

<style>
  .minard {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
</style>
