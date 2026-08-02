<script lang="ts">
  import { GeomCount, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

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
    title="Overlapping points sized by how many share a cell"
    subtitle="Heights rounded to the inch; each mark grows with the number of families on it"
    x="Mid-parent height (inches)"
    y="Child height (inches)"
    size="Children"
  />
  <GeomCount alpha={0.7} />
</GGPlot>
