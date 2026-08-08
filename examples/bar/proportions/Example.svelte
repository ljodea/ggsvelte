<script lang="ts">
  import {
    GeomBar,
    GGPlot,
    Inspect,
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
  <GeomBar position="fill" />
  <ScaleYContinuous labels=".0%" />
  <ScaleFillManual
    domain={["Soldiers", "Sailors"]}
    values={["#c14a3d", "#3c6e8f"]}
  />
  <ThemeFivethirtyeight />
  <Labs
    title="Parts of a whole within each group"
    subtitle="Share of soldiers and sailors in each squadron"
    x="Squadron"
    y="Share of complement"
    fill="Role"
  />
  <Inspect mode="exact" pin />
</GGPlot>
