<script lang="ts">
  import { GeomCol, GGPlot } from "@ggsvelte/svelte";

  import { SAMPLE_LABELS, SAMPLES, yeastCounts } from "./data.js";
</script>

<GGPlot
  data={yeastCounts}
  aes={{ x: "cells", y: "squares", fill: "sample" }}
  theme="light"
  facet={{
    wrap: {
      field: "sample",
      levels: [...SAMPLES],
      labels: { ...SAMPLE_LABELS },
    },
    ncol: 1,
    strip: { position: "left" },
  }}
  scales={{
    fill: { type: "ordinal", domain: [...SAMPLES], scheme: "flexoki" },
  }}
  guides={{ fill: { type: "none" } }}
  labs={{
    title: "Counting yeast under a microscope",
    subtitle:
      "Gosset, 1907: cells per haemacytometer square, 400 squares per sample",
    x: "Cells in a square",
    y: "Squares",
  }}
  width={640}
  height={400}
>
  <GeomCol alpha={0.9} />
</GGPlot>
