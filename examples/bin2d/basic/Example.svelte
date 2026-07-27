<script lang="ts">
  import {
    GeomBin2d,
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
    title="geom_bin2d — rectangular 2D bins"
    subtitle="400 points in two overlapping clouds; fill = after_stat count"
    x="x"
    y="y"
    fill="count"
  />
  <GeomBin2d bins={24} />
</GGPlot>
