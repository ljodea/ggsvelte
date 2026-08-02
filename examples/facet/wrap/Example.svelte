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
    title="One panel per parent height class"
    subtitle="Child height against the other parent; panels step through the first parent's height"
    x="Child's height (inches)"
    y="Children"
  />
  <GeomHistogram bins={18} />
</GGPlot>
