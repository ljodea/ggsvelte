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
  const subtitle =
    "Above the automatic threshold the marks go to canvas instead of SVG; the cloud is seeded, because the subject here is the render path";
</script>

<GGPlot
  data={cloud}
  aes={{ x: "x", y: "y", color: "cluster" }}
  width={640}
  height={400}
>
  <ThemeDark />
  <ScaleColorManual domain={["a", "b"]} values={["#da702c", "#4385be"]} />
  <Labs {title} {subtitle} x="x" y="y" color="Cluster" />
  <GeomPoint size={1.2} alpha={0.4} />
</GGPlot>
