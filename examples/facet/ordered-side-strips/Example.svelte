<script lang="ts">
  import {
    FacetWrap,
    GeomCol,
    GGPlot,
    GuideNone,
    Labs,
    ScaleFillDiscrete,
    ThemeLight,
  } from "@ggsvelte/svelte";

  import { SAMPLE_LABELS, SAMPLES, yeastCounts } from "./data.js";
</script>

<GGPlot
  data={yeastCounts}
  aes={{ x: "cells", y: "squares", fill: "sample" }}
  width={640}
  height={400}
>
  <ThemeLight />
  <FacetWrap
    field={{
      field: "sample",
      levels: [...SAMPLES],
      labels: { ...SAMPLE_LABELS },
    }}
    ncol={1}
    strip={{ position: "left" }}
  />
  <ScaleFillDiscrete domain={[...SAMPLES]} scheme="flexoki" />
  <GuideNone channel="fill" />
  <Labs
    title="Counting yeast under a microscope"
    subtitle="Gosset, 1907: cells per haemacytometer square, 400 squares per sample"
    x="Cells in a square"
    y="Squares"
  />
  <GeomCol alpha={0.9} />
</GGPlot>
