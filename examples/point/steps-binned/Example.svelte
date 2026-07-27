<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorSteps,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { stepsPoints } from "./data.js";
</script>

<GGPlot
  data={stepsPoints}
  aes={{ x: "x", y: "y", color: "z" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleColorSteps low="#132B43" high="#56B1F7" />
  <Labs
    title="scale_color_steps"
    subtitle="Binned continuous colour with hard steps (low → high)"
    x="x"
    y="y"
    color="z"
  />
  <GeomPoint size={4} />
</GGPlot>
