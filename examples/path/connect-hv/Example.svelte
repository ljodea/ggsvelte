<script lang="ts">
  import {
    GeomPath,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleXContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { retreatCold } from "./data.js";
</script>

<GGPlot
  data={retreatCold}
  aes={{ x: "long", y: "temp" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleXContinuous reverse={true} />
  <Labs
    title="The cold Minard drew under the retreat"
    subtitle="Nine readings between Moscow and Wilna, each carried west until the next"
    x="Longitude east"
    y="Degrees Réaumur"
  />
  <GeomPath stat="connect" connection="hv" linewidth={2.5} alpha={0.95} />
  <GeomPoint size={3.5} alpha={0.85} />
</GGPlot>
