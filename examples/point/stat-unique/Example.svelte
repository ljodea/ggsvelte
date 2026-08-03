<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    registerUnique,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  // stat= override: the shell registers only its default stat (#1420).
  registerUnique();

  import { deadlyQuarrels } from "./data.js";
</script>

<GGPlot
  data={deadlyQuarrels}
  aes={{ x: "year", y: "magnitude" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <Labs
    title="Collapse duplicate coordinates to unique marks"
    subtitle="One row per belligerent pair becomes one mark per distinct (year, magnitude)"
    x="Year the quarrel began"
    y="Magnitude (log10 killed)"
  />
  <GeomPoint stat="unique" size={3} alpha={0.8} />
</GGPlot>
