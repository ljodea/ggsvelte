<script lang="ts">
  import { GeomHistogram, GGPlot } from "@ggsvelte/svelte";

  import { familyHeights } from "./data.js";
</script>

<GGPlot
  data={familyHeights}
  aes={{ x: "child", weight: "n" }}
  theme="ggplot2"
  facet={{ wrap: "pair", ncol: 2 }}
  labs={{
    title: "4,892 English children, measured by Pearson and Lee",
    subtitle:
      "Sons stand four and a half inches taller; the two daughter panels are the same girls, tabulated against each parent",
    x: "Child's height (inches)",
    y: "Children",
  }}
  width={640}
  height={400}
>
  <GeomHistogram bins={18} />
</GGPlot>
