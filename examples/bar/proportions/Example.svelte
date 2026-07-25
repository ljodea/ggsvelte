<script lang="ts">
  import {
    GeomBar,
    GGPlot,
    Labs,
    ScaleFillManual,
    ScaleYContinuous,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { armadaCrews } from "./data.js";
</script>

<GGPlot
  data={armadaCrews}
  aes={{ x: "squadron", fill: "role", weight: "men" }}
  width={640}
  height={400}
>
  <ThemeFivethirtyeight />
  <ScaleYContinuous labels=".0%" />
  <ScaleFillManual
    domain={["Soldiers", "Sailors"]}
    values={["#c14a3d", "#3c6e8f"]}
  />
  <Labs
    title="Who sailed with the Armada, 1588"
    subtitle="Soldiers outnumber sailors everywhere except the galleys and the light pataches"
    x="Squadron"
    y="Share of complement"
    fill="Role"
  />
  <GeomBar position="fill" />
</GGPlot>
