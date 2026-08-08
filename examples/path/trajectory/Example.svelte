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

  import {
    campaignRivers,
    minardCityLabels,
    minardColdStations,
    minardStrengthLabels,
    minardTroops,
  } from "./data.js";

  // Shared keys: cold strip and map station points both use stationKey so a
  // click on Nov 09 selects the same retreat station on the march map.
  // Only one inspectable layer per plot may own those keys (engine: unique
  // PropertyKey per plot). Path uses plain troops without stationKey.
  const interaction = createPlotInteraction<string>();
  const scope = { keys: "minard-cold-station" } as const;
</script>

<div class="minard">
  <GGPlot
    width={960}
    height={520}
    select={{ type: "point" }}
    tool="point"
    {interaction}
    interactionScope={scope}
  >
    <Inspect mode="xy" pin maxDistance={24} identity="stationKey" />
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
    <!-- Plain troops: no stationKey so path inspect stays free of key collisions -->
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
    <!-- Sole map owner of stationKey: pin targets with date + linked selection -->
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

  <!-- Plot-level data so path + point share one row namespace for stationKey -->
  <GGPlot
    data={minardColdStations}
    width={960}
    height={190}
    select={{ type: "point" }}
    tool="point"
    {interaction}
    interactionScope={scope}
  >
    <Inspect mode="xy" pin maxDistance={24} identity="stationKey" />
    <ThemeClassic />
    <ScaleXContinuous limits={[23.5, 38.2]} />
    <Labs
      title="The cold on the road back"
      subtitle="Select a reading to highlight the same station on the march map"
      x="Longitude east"
      y="°Réaumur"
    />
    <GeomPath
      aes={{ x: "long", y: "temp", color: { value: "#6b7280" } }}
      linewidth={1.5}
    />
    <GeomPoint
      aes={{ x: "long", y: "temp", color: { value: "#374151" }, label: "date" }}
      size={2.5}
    />
    <GeomText
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
