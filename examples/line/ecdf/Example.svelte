<script lang="ts">
  import { GeomLine, GGPlot, Labs, ThemeClassic } from "@ggsvelte/svelte";

  import { deadlyQuarrels } from "./data.js";
</script>

<GGPlot data={deadlyQuarrels} aes={{ x: "magnitude" }} width={640} height={400}>
  <ThemeClassic />
  <Labs
    title="Empirical distribution of event sizes"
    subtitle="How many wars reach each magnitude on a step from zero to one"
    x="Magnitude (log10 killed)"
    y="Share of quarrels at or below"
  />
  <GeomLine stat="ecdf" curve="step-hv" linewidth={1.8} pad={true} />
</GGPlot>
