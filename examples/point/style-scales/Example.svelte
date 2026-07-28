<script lang="ts">
  import {
    GeomPath,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleAlphaContinuous,
    ScaleColorDiscrete,
    ScaleLinetypeDiscrete,
    ScaleLinewidthContinuous,
    ScaleShapeDiscrete,
    ScaleSizeContinuous,
  } from "@ggsvelte/svelte";

  import { marchRoute } from "./data.js";
</script>

<GGPlot
  data={marchRoute}
  aes={{ x: "long", y: "lat", color: "direction" }}
  width={640}
  height={400}
>
  <ScaleSizeContinuous range={[2, 9]} />
  <ScaleAlphaContinuous range={[0.4, 1]} />
  <ScaleLinewidthContinuous range={[1, 9]} />
  <ScaleShapeDiscrete range={["circle", "triangle"]} />
  <ScaleLinetypeDiscrete range={["solid", "dashed"]} />
  <ScaleColorDiscrete scheme="tableau10" />
  <Labs
    title="Minard's march on five style channels"
    subtitle="Width, size and fade all carry strength; line type and shape carry direction"
    x="Longitude east"
    y="Latitude north"
    size="Men left"
    alpha="Men left"
    linewidth="Men left"
    shape="Direction"
    linetype="Direction"
    color="Direction"
  />
  <GeomPath
    aes={{ group: "leg", linewidth: "survivors", linetype: "direction" }}
    alpha={0.85}
  />
  <GeomPoint
    aes={{ size: "survivors", alpha: "survivors", shape: "direction" }}
  />
</GGPlot>
