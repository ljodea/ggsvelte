<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorGradient,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { gradientPoints } from "./data.js";
</script>

<GGPlot
  data={gradientPoints}
  aes={{ x: "x", y: "y", color: "z" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleColorGradient low="#132B43" high="#56B1F7" />
  <Labs
    title="scale_color_gradient"
    subtitle="Two-stop continuous colour (low → high)"
    x="x"
    y="y"
    color="z"
  />
  <GeomPoint size={4} />
</GGPlot>
