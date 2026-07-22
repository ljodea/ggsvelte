<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { data } from "./data.js";
</script>

<GGPlot
  {data}
  aes={{ x: "x", y: "y" }}
  scales={{
    size: { type: "sequential", range: [3, 10] },
    alpha: { type: "sequential", range: [0.35, 1] },
    linewidth: { type: "sequential", range: [1, 5] },
    shape: { type: "ordinal", range: ["circle", "triangle"] },
    linetype: { type: "ordinal", range: ["solid", "dashed"] },
  }}
  labs={{
    title: "Complete mapped style scales",
    subtitle: "Five data-driven style channels",
    x: "Observation",
    y: "Value",
    size: "Magnitude",
    alpha: "Confidence",
    linewidth: "Weight",
    shape: "Region",
    linetype: "Region",
  }}
  width="container"
  height={760}
  key="id"
  legendFocus
>
  <GeomLine
    aes={{ group: "group", linewidth: "weight", linetype: "group" }}
    alpha={0.7}
  />
  <GeomPoint aes={{ size: "magnitude", alpha: "confidence", shape: "group" }} />
</GGPlot>
