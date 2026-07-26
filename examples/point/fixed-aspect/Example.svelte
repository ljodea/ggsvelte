<script lang="ts">
  import { CoordFixed, GeomPoint, GGPlot, Labs } from "@ggsvelte/svelte";

  import { unitCircle } from "./data.js";
</script>

<GGPlot
  data={unitCircle}
  aes={{ x: "x", y: "y" }}
  width="container"
  height={440}
>
  <CoordFixed />
  <Labs
    title="Equal units stay circular"
    subtitle="coord_fixed preserves one CSS pixel per x and y data unit"
    x="x"
    y="y"
  />
  <GeomPoint size={3} />
</GGPlot>
