<script lang="ts">
  import {
    GeomLine,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleAlphaContinuous,
    ScaleLinetypeDiscrete,
    ScaleLinewidthContinuous,
    ScaleShapeDiscrete,
    ScaleSizeContinuous,
  } from "@ggsvelte/svelte";

  import { data } from "./data.js";
</script>

<GGPlot
  {data}
  aes={{ x: "x", y: "y" }}
  width="container"
  height={760}
  key="id"
  legendFocus
>
  <ScaleSizeContinuous range={[3, 10]} />
  <ScaleAlphaContinuous range={[0.35, 1]} />
  <ScaleLinewidthContinuous range={[1, 5]} />
  <ScaleShapeDiscrete range={["circle", "triangle"]} />
  <ScaleLinetypeDiscrete range={["solid", "dashed"]} />
  <Labs
    title="Complete mapped style scales"
    subtitle="Five data-driven style channels"
    x="Observation"
    y="Value"
    size="Magnitude"
    alpha="Confidence"
    linewidth="Weight"
    shape="Region"
    linetype="Region"
  />
  <GeomLine
    aes={{ group: "group", linewidth: "weight", linetype: "group" }}
    alpha={0.7}
  />
  <GeomPoint aes={{ size: "magnitude", alpha: "confidence", shape: "group" }} />
</GGPlot>
