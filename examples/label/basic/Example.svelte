<script lang="ts">
  import {
    GeomPoint,
    GeomLabel,
    GGPlot,
    Labs,
    ScaleColorManual,
    ScaleFillManual,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { langren1644 } from "./data.js";
</script>

<GGPlot
  data={langren1644}
  aes={{ x: "longitude", y: "rank" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleColorManual
    domain={["Astronomy", "Map"]}
    values={["#205ea6", "#a02f6f"]}
  />
  <ScaleFillManual
    domain={["Astronomy", "Map"]}
    values={["#e8f0fb", "#f8e8f0"]}
  />
  <Labs
    title="Every name on the first statistical graph, boxed"
    subtitle="Van Langren, 1644: a background box keeps each name readable over the rule beneath"
    x="Estimated Toledo–Rome longitude (°)"
    y="Ordered by estimate"
    color="Derived from"
    fill=""
  />
  <GeomPoint size={3.5} aes={{ color: "source" }} />
  <GeomLabel
    aes={{ label: "name", fill: "source" }}
    anchor="start"
    dx={7}
    size={10}
    padding={3}
    radius={3}
  />
</GGPlot>
