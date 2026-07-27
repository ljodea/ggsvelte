<script lang="ts">
  import {
    GeomPoint,
    GeomSpoke,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { vectorField } from "./data.js";
</script>

<GGPlot
  data={vectorField}
  aes={{ x: "x", y: "y", angle: "angle", radius: "radius" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Spoke vector field"
    subtitle="geom_spoke: origin + angle (radians) + radius → segment"
    x="x"
    y="y"
  />
  <GeomSpoke linewidth={1.6} lineend="round" alpha={0.9} />
  <GeomPoint size={2} alpha={0.55} />
</GGPlot>
