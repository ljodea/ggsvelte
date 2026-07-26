<script lang="ts">
  import { GeomPath, GeomPoint, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { stepCorners } from "./data.js";
</script>

<GGPlot data={stepCorners} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="stat connect: hv path joins"
    subtitle="Three data points expand to horizontal-then-vertical elbows"
    x="x"
    y="y"
  />
  <GeomPath stat="connect" connection="hv" linewidth={2.5} alpha={0.95} />
  <GeomPoint size={3.5} alpha={0.85} />
</GGPlot>
