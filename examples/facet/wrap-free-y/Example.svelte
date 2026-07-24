<script lang="ts">
  import { GeomLine, GGPlot } from "@ggsvelte/svelte";

  import { londonBills } from "./data.js";
</script>

<GGPlot
  data={londonBills}
  aes={{ x: "year", y: "value", color: "measure" }}
  theme="fivethirtyeight"
  facet={{
    wrap: {
      field: "measure",
      levels: [
        "Male / female ratio",
        "Male christenings",
        "All burials",
        "Plague deaths",
      ],
    },
    ncol: 2,
    scales: "free_y",
  }}
  scales={{ x: { labels: "d" } }}
  guides={{ color: { type: "none" } }}
  labs={{
    title: "London's bills of mortality, 1629–1710",
    subtitle:
      "The ratio never once falls below 1 — Arbuthnot's argument, on its own scale",
    x: "Year",
    y: "",
  }}
  width={640}
  height={400}
>
  <GeomLine linewidth={1.6} />
</GGPlot>
