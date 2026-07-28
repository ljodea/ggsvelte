<script lang="ts">
  import {
    GeomErrorbar,
    GeomLine,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { galtonHeights } from "./data.js";
</script>

<GGPlot
  data={galtonHeights}
  aes={{ x: "parent", y: "child" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Galton's children regress towards the middle"
    subtitle="Mean child height ± one standard error in each one-inch class of mid-parent height"
    x="Mid-parent height (inches)"
    y="Child height (inches)"
  />
  <GeomPoint alpha={0.15} size={2.4} />
  <GeomErrorbar
    stat="summary_bin"
    binwidth={1}
    boundary={0}
    width={0.35}
    linewidth={1.4}
  />
  <GeomLine stat="summary_bin" binwidth={1} boundary={0} linewidth={1.6} />
</GGPlot>
