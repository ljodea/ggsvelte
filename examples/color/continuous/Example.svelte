<script lang="ts">
  import {
    CoordFixed,
    GeomPoint,
    GGPlot,
    Inspect,
    Labs,
    ScaleColorContinuous,
    ThemeDark,
  } from "@ggsvelte/svelte";

  import { greatLakesSurveys, greatLakesTruth } from "./data.js";
</script>

<GGPlot
  data={greatLakesSurveys}
  aes={{ x: "long", y: "lat", color: "year" }}
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <ThemeDark />
  <CoordFixed />
  <ScaleColorContinuous scheme="viridis" labels="d" />
  <Labs
    title="Map attempts against true positions"
    subtitle="White crosses are truth; each dot is one historical map's attempt at a point"
    x="Longitude (°)"
    y="Latitude (°)"
    color="Map year"
  />
  <GeomPoint size={2.6} alpha={0.75} />
  <GeomPoint
    data={greatLakesTruth}
    aes={{ x: "long", y: "lat", color: { value: "#ffffff" } }}
    size={3.4}
    shape="cross"
  />
</GGPlot>
