<script lang="ts">
  import {
    CoordFixed,
    GeomPoint,
    GeomSpoke,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { maungaWhauSlope } from "./data.js";
</script>

<GGPlot
  data={maungaWhauSlope}
  aes={{ x: "east", y: "north", angle: "angle", radius: "fall" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <CoordFixed />
  <Labs
    title="Which way the water runs off Maunga Whau"
    subtitle="Downhill direction at 140 points, arrow length by how steep the ground is"
    x="Metres east"
    y="Metres north"
  />
  <GeomSpoke linewidth={1.6} lineend="round" alpha={0.9} />
  <GeomPoint size={2} alpha={0.7} />
</GGPlot>
