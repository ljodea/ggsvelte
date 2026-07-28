<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorManual,
    ThemeDark,
  } from "@ggsvelte/svelte";

  import { CANVAS_SCATTER_MARKS, cloud } from "./data.js";

  const title = `${CANVAS_SCATTER_MARKS.toLocaleString("en-US")} points on a canvas stratum`;
</script>

<GGPlot
  data={cloud}
  aes={{ x: "x", y: "y", color: "cluster" }}
  width={640}
  height={400}
>
  <ThemeDark />
  <ScaleColorManual domain={["a", "b"]} values={["#da702c", "#4385be"]} />
  <Labs {title} x="x" y="y" color="Cluster" />
  <GeomPoint size={1.2} alpha={0.4} />
</GGPlot>
