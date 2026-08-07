<script lang="ts">
  import {
    GeomFreqpoly,
    GeomRule,
    GGPlot,
    Inspect,
    Labs,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { michelson } from "./data.js";
</script>

<GGPlot data={michelson} aes={{ x: "velocity" }} width={640} height={400}>
  <Inspect mode="x" pin />
  <ThemeFivethirtyeight />
  <Labs
    title="Frequency polygon through bin centres"
    subtitle="Same speed-of-light runs as the histogram, joined at the tops of the bins"
    x="Velocity (km/s − 299,000)"
    y="Runs"
  />
  <GeomFreqpoly binwidth={40} linewidth={1.4} />
  <GeomRule
    xintercept={734.5}
    linewidth={1.2}
    aes={{ color: { value: "#d14d41" } }}
  />
</GGPlot>
