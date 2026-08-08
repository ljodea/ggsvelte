<script lang="ts">
  import {
    GeomDensity,
    GGPlot,
    Inspect,
    Labs,
    ScaleFillManual,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { galtonChildren } from "./data.js";
</script>

<GGPlot
  data={galtonChildren}
  aes={{ x: "height", fill: "gender" }}
  width={640}
  height={400}
>
  <GeomDensity alpha={0.45} />
  <ScaleFillManual
    domain={["Daughters", "Sons"]}
    values={["#8b7ec8", "#3aa99f"]}
  />
  <ThemeMinimal />
  <Labs
    title="Two densities on one axis"
    subtitle="Heights for sons and daughters; the means separate while the ranges overlap"
    x="Height (inches)"
    y="Density"
    fill="Child"
  />
  <Inspect mode="x" pin />
</GGPlot>
