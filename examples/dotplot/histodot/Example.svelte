<script lang="ts">
  import {
    GeomDotplot,
    GGPlot,
    Inspect,
    Labs,
    ScaleYContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { earthDensity } from "./data.js";
</script>

<GGPlot data={earthDensity} aes={{ x: "density" }} width={640} height={400}>
  <Inspect mode="exact" pin />
  <ThemeClassic />
  <Labs
    title="One dot per measurement, stacked in bins"
    subtitle="Twenty-nine runs of a torsion balance; the modern density sits at 5.517"
    x="Density of the earth, water = 1"
    y="Runs"
  />
  <ScaleYContinuous breaks={[0, 1, 2, 3, 4, 5]} />
  <GeomDotplot binwidth={0.05} boundary={0} stackdir="up" />
</GGPlot>
