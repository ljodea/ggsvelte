<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorViridisC,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { viridisPoints } from "./data.js";
</script>

<GGPlot
  data={viridisPoints}
  aes={{ x: "x", y: "y", color: "z" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleColorViridisC option="plasma" />
  <Labs
    title="scale_color_viridis_c"
    subtitle="Named viridis-family continuous colour (option: plasma)"
    x="x"
    y="y"
    color="z"
  />
  <GeomPoint size={4} />
</GGPlot>
