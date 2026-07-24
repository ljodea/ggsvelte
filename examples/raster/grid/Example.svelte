<script lang="ts">
  import { GeomRaster, GGPlot, scaleFillContinuous } from "@ggsvelte/svelte";

  import { criminalStature } from "./data.js";
</script>

<GGPlot
  data={criminalStature}
  aes={{ x: "finger", y: "height", fill: "men" }}
  theme="few"
  scales={scaleFillContinuous({ scheme: "viridis" })}
  labs={{
    title: "Three thousand criminals, measured",
    subtitle:
      "Macdonell, 1902: stature against left middle-finger length, 495 cells of a complete grid",
    x: "Left middle finger (cm)",
    y: "Height (feet)",
    fill: "Men",
  }}
  width={640}
  height={400}
>
  <GeomRaster />
</GGPlot>
