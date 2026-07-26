<script lang="ts">
  import {
    GeomPoint,
    GeomStep,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { ecdfSample } from "./data.js";
</script>

<GGPlot data={ecdfSample} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Empirical CDF as a step line"
    subtitle="geom_step direction hv — horizontal, then vertical"
    x="x"
    y="F̂(x)"
  />
  <GeomStep direction="hv" linewidth={1.8} />
  <GeomPoint size={2.2} alpha={0.85} />
</GGPlot>
