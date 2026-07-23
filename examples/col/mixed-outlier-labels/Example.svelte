<script lang="ts">
  import { GeomCol, GGPlot } from "@ggsvelte/svelte";

  import { filings } from "./data.js";
</script>

<!--
  640px width is intentional (#634): mixed short + one multi-word outlier must
  wrap at desktop width, not escalate to −90° + truncate.
-->
<GGPlot
  data={filings}
  aes={{ x: "category", y: "count" }}
  labs={{
    title: "Filing types (mixed label lengths)",
    x: "Category",
    y: "Count",
  }}
  width={640}
  height={320}
>
  <GeomCol />
</GGPlot>
