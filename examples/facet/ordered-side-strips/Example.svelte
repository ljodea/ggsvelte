<script lang="ts">
  import { GeomCol, GGPlot } from "@ggsvelte/svelte";

  import { REGION_LABELS, REGIONS, samples } from "./data.js";
</script>

<GGPlot
  data={samples}
  aes={{ x: "quarter", y: "score", fill: { value: "#3b82f6" } }}
  facet={{
    wrap: {
      field: "region",
      levels: [...REGIONS],
      labels: { ...REGION_LABELS },
    },
    ncol: 1,
    strip: { position: "left" },
  }}
  labs={{
    title: "Regional score by quarter",
    subtitle: "Authored panel order with left strips",
    x: "Quarter",
    y: "Score",
  }}
  width={640}
  height={480}
>
  <GeomCol alpha={0.85} />
</GGPlot>
