<script lang="ts">
  import {
    GeomBlank,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { earthDensity, waterDensity } from "./data.js";
</script>

<GGPlot
  data={earthDensity}
  aes={{ x: "trial", y: "density" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Five and a half times the density of water"
    subtitle="A blank row at water's own density opens the axis down to 1"
    x="Determination"
    y="Density of the earth, water = 1"
  />
  <GeomPoint size={3.5} alpha={0.9} />
  <GeomBlank data={waterDensity} aes={{ x: "trial", y: "density" }} />
</GGPlot>
