<script lang="ts">
  import { coordFixed, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { unitCircle } from "./data.js";
</script>

<GGPlot
  data={unitCircle}
  aes={{ x: "x", y: "y" }}
  coord={coordFixed()}
  labs={{
    title: "Equal units stay circular",
    subtitle: "coord_fixed preserves one CSS pixel per x and y data unit",
    x: "x",
    y: "y",
  }}
  width="container"
  height={440}
>
  <GeomPoint size={3} />
</GGPlot>
