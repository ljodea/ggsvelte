<script lang="ts">
  import {
    CoordFixed,
    GeomContour,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { maungaWhau } from "./data.js";
</script>

<GGPlot
  data={maungaWhau}
  aes={{ x: "east", y: "north", z: "height" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <CoordFixed />
  <Labs
    title="Maunga Whau, height by height"
    subtitle="Ten levels between 94 m and 191 m, each drawn as a line of equal height"
    x="Metres east"
    y="Metres north"
  />
  <GeomContour bins={10} linewidth={1} />
</GGPlot>
