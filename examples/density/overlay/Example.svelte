<script lang="ts">
  import {
    GeomDensity,
    GGPlot,
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
  <ThemeMinimal />
  <ScaleFillManual
    domain={["Daughters", "Sons"]}
    values={["#8b7ec8", "#3aa99f"]}
  />
  <Labs
    title="Heights of Galton's 934 adult children"
    subtitle="Two overlapping distributions, separated at the means"
    x="Height (inches)"
    y="Density"
    fill="Child"
  />
  <GeomDensity alpha={0.45} />
</GGPlot>
