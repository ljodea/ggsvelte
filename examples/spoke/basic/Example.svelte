<script lang="ts">
  import {
    GeomPoint,
    GeomSpoke,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { wind } from "./data.js";
</script>

<GGPlot
  data={wind}
  aes={{ x: "x", y: "y", angle: "theta", radius: "r", color: "station" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="geom_spoke directions"
    subtitle="Segments from (x, y) by angle (radians) and radius (#810)"
    color="station"
  />
  <GeomSpoke linewidth={1.4} />
  <GeomPoint size={2.5} />
</GGPlot>
