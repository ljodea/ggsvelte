<script lang="ts">
  import {
    FacetWrap,
    GeomHistogram,
    GGPlot,
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
  <ThemeGgplot2 />
  <FacetWrap field="pair" ncol={2} />
  <Labs
    title="4,892 English children, measured by Pearson and Lee"
    subtitle="Sons stand four and a half inches taller; the two daughter panels are the same girls, tabulated against each parent"
    x="Child's height (inches)"
    y="Children"
  />
  <GeomHistogram bins={18} />
</GGPlot>
