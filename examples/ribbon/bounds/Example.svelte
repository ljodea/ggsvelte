<script lang="ts">
  import { GeomLine, GeomRibbon, GGPlot } from "@ggsvelte/svelte";

  import { breslauBurials } from "./data.js";
</script>

<GGPlot
  data={breslauBurials}
  aes={{ x: "age", ymin: "lo", ymax: "hi" }}
  theme="clean"
  scales={{ y: { type: "sqrt" } }}
  labs={{
    title: "Halley's Breslau burials, 1687–1691",
    subtitle:
      "Five years of records; the band is the observed year-to-year range at each age",
    x: "Age at death",
    y: "Burials per year (square-root scale)",
  }}
  width={640}
  height={400}
>
  <GeomRibbon alpha={0.35} aes={{ fill: { value: "#4385be" } }} />
  <GeomLine
    aes={{ x: "age", y: "mean", color: { value: "#1a4a6b" } }}
    linewidth={1.6}
  />
</GGPlot>
