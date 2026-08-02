<script lang="ts">
  import {
    GeomPoint,
    GeomText,
    GGPlot,
    Labs,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { langren1644 } from "./data.js";
</script>

<GGPlot
  data={langren1644}
  aes={{ x: "longitude", y: "rank" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <Labs
    title="Bare text labels on points"
    subtitle="Each estimate is a name; labels draw exactly where they are placed"
    x="Estimated Toledo–Rome longitude (°)"
    y="Ordered by estimate"
  />
  <GeomPoint size={2.2} alpha={0.4} aes={{ color: { value: "#4a5568" } }} />
  <GeomText
    aes={{ label: "name", color: { value: "#1a202c" } }}
    anchor="start"
    dx={7}
    size={12}
  />
</GGPlot>
