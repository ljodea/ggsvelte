<script lang="ts">
  import {
    CoordFixed,
    GeomPath,
    GeomPoint,
    GeomText,
    GGPlot,
    Labs,
    ScaleColorManual,
    ScaleLinewidthContinuous,
    ScaleXContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import {
    campaignRivers,
    minardCities,
    minardCold,
    minardTroops,
  } from "./data.js";

  // Label nudges in degrees, so names clear the bands the way Minard placed
  // them: Kowno left of the crossing, the Vilna-loop names off the band.
  const NUDGES: Record<string, readonly [number, number]> = {
    Kowno: [-0.3, 0.05],
    Wilna: [0, -0.24],
    Smorgoni: [-0.1, -0.22],
    Molodezno: [0.1, 0.14],
    Studienska: [0, -0.34],
    Bobr: [0.2, 0.1],
    Polotzk: [0, 0.12],
    "Malo-Jarosewii": [0, -0.2],
    Moscou: [0.12, 0.06],
  };
  const cityLabels = minardCities.map((c) => {
    const [dx, dy] = NUDGES[c.city] ?? [0, 0];
    return { ...c, lx: c.long + dx, ly: c.lat + dy };
  });

  // The strength counts Minard lettered along the bands, placed just clear of
  // the ink (his are rotated along the march; geom_text stays horizontal).
  const strengthLabels: { long: number; lat: number; count: string }[] = [
    { long: 25.5, lat: 55.3, count: "340,000" },
    { long: 24.2, lat: 55.5, count: "60,000" },
    { long: 24.2, lat: 55.62, count: "22,000" },
    { long: 26.4, lat: 55.92, count: "40,000" },
    { long: 30.3, lat: 55.66, count: "175,000" },
    { long: 32.9, lat: 55.36, count: "140,000" },
    { long: 37.2, lat: 56.12, count: "100,000" },
    { long: 36.5, lat: 54.72, count: "97,000" },
    { long: 34.3, lat: 54.88, count: "55,000" },
    { long: 33.3, lat: 54.48, count: "37,000" },
    { long: 31.6, lat: 54.3, count: "24,000" },
    { long: 28.9, lat: 53.78, count: "20,000" },
    { long: 25.0, lat: 54.14, count: "8,000" },
    { long: 24.1, lat: 54.12, count: "4,000" },
  ];
</script>

<div class="minard">
  <GGPlot width={960} height={520}>
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
      data={cityLabels}
      aes={{ x: "lx", y: "ly", label: "city", color: { value: "#4a4237" } }}
      size={10}
      dy={-9}
    />
    <GeomText
      data={strengthLabels}
      aes={{ x: "long", y: "lat", label: "count", color: { value: "#6b5d4a" } }}
      size={9}
    />
  </GGPlot>

  <GGPlot width={960} height={190}>
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
