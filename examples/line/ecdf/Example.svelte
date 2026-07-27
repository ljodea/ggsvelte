<script lang="ts">
  import { GeomLine, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { ecdfSample } from "./data.js";
</script>

<GGPlot data={ecdfSample} aes={{ x: "x" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Empirical CDF"
    subtitle="stat ecdf + curve step-hv (horizontal then vertical)"
    x="x"
    y="F̂(x)"
  />
  <GeomLine stat="ecdf" curve="step-hv" linewidth={1.8} pad={true} />
</GGPlot>
