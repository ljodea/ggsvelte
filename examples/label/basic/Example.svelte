<script lang="ts">
  import {
    GeomPoint,
    GeomLabel,
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
    title="Text with rounded background boxes"
    subtitle="Same labels as GeomText, with a measured box behind each name"
    x="Estimated Toledo–Rome longitude (°)"
    y="Ordered by estimate"
  />
  <GeomPoint size={2.2} alpha={0.4} aes={{ color: { value: "#4a5568" } }} />
  <GeomLabel
    aes={{
      label: "name",
      fill: { value: "#dbe4f0" },
      color: { value: "#0f172a" },
    }}
    anchor="start"
    dx={7}
    size={12}
    padding={5}
    radius={5}
    linewidth={1.8}
  />
</GGPlot>
