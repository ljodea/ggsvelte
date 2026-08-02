<script lang="ts">
  import {
    FacetWrap,
    GeomLine,
    GGPlot,
    GuideNone,
    Labs,
    ScaleXContinuous,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { londonBills } from "./data.js";
</script>

<GGPlot
  data={londonBills}
  aes={{ x: "year", y: "value", color: "measure" }}
  width={640}
  height={400}
>
  <ThemeFivethirtyeight />
  <FacetWrap
    field={{
      field: "measure",
      levels: [
        "Male / female ratio",
        "Male christenings",
        "All burials",
        "Plague deaths",
      ],
    }}
    ncol={2}
    scales="free_y"
  />
  <ScaleXContinuous labels="d" />
  <GuideNone channel="color" />
  <Labs
    title="Facets with free y scales"
    subtitle="Christenings and burials on their own vertical ranges so neither series flattens"
    x="Year"
    y=""
  />
  <GeomLine linewidth={1.6} />
</GGPlot>
