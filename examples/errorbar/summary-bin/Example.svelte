<script lang="ts">
  import {
    GeomErrorbar,
    GeomLine,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { binnedScatter } from "./data.js";
</script>

<GGPlot data={binnedScatter} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="stat summary_bin: mean ± se by x bin"
    subtitle="Continuous x binned at width 1; empty bins omitted"
    x="x"
    y="y"
  />
  <GeomPoint alpha={0.4} size={2.4} />
  <GeomErrorbar
    stat="summary_bin"
    binwidth={1}
    boundary={0}
    width={0.35}
    linewidth={1.4}
  />
  <GeomLine stat="summary_bin" binwidth={1} boundary={0} linewidth={1.6} />
</GGPlot>
