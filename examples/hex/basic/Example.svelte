<script lang="ts">
  import {
    GeomHex,
    GGPlot,
    Labs,
    ScaleFillContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { cloud } from "./data.js";
</script>

<GGPlot data={cloud} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeMinimal />
  <ScaleFillContinuous scheme="viridis" />
  <Labs
    title="geom_hex — hexagonal 2D bins"
    subtitle="500 points; fill = after_stat count"
    x="x"
    y="y"
    fill="count"
  />
  <GeomHex bins={18} />
</GGPlot>
