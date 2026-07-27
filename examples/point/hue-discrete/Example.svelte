<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorHue,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { hueGroups } from "./data.js";
</script>

<GGPlot
  data={hueGroups}
  aes={{ x: "x", y: "y", color: "group" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleColorHue />
  <Labs
    title="scale_color_hue"
    subtitle="Even-hue discrete colour (ggplot2-shaped default discrete path)"
    color="group"
  />
  <GeomPoint size={4} />
</GGPlot>
