<script lang="ts">
  import {
    FacetWrap,
    GeomHistogram,
    GGPlot,
    Inspect,
    Labs,
    ThemeGgplot2,
  } from "@ggsvelte/svelte";

  import { familyHeights } from "./data.js";
</script>

<GGPlot
  data={familyHeights}
  aes={{ x: "child", weight: "n" }}
  width={640}
  height={400}
>
  <Inspect mode="exact" pin />
  <ThemeGgplot2 />
  <FacetWrap field="pair" ncol={2} />
  <Labs
    title="One panel per parent–child pair type"
    subtitle="Child height histograms for father→son, father→daughter, mother→son, mother→daughter"
    x="Child's height (inches)"
    y="Children"
  />
  <GeomHistogram bins={18} />
</GGPlot>
