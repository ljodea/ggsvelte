<script lang="ts">
  import { GeomCol, GGPlot, Labs } from "@ggsvelte/svelte";

  import { filings } from "./data.js";
</script>

<!--
  480px width is intentional (#406): band label planner escalates wrap→rotate
  for long Spanish multi-word and German single-token categories.
-->
<GGPlot
  data={filings}
  aes={{ x: "category", y: "count" }}
  width={480}
  height={420}
>
  <Labs title="Filing types (long category labels)" x="Category" y="Count" />
  <GeomCol />
</GGPlot>
