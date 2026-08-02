<script lang="ts">
  import {
    GeomStep,
    GGPlot,
    Labs,
    ScaleXContinuous,
    ScaleYContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { stairVertices } from "./data.js";
</script>

<GGPlot data={stairVertices} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeMinimal />
  <ScaleXContinuous limits={[0.5, 5.5]} />
  <ScaleYContinuous limits={[0, 6]} />
  <Labs
    title="Thick staircase"
    subtitle="Five vertices joined horizontal-then-vertical"
    x="x"
    y="y"
  />
  <GeomStep
    direction="hv"
    linewidth={3.4}
    aes={{ color: { value: "#1a202c" } }}
  />
</GGPlot>
