<script lang="ts">
  import {
    GeomBin2d,
    GGPlot,
    Labs,
    ScaleFillContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { oldFaithful } from "./data.js";
</script>

<GGPlot
  data={oldFaithful}
  aes={{ x: "duration", y: "waiting" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleFillContinuous scheme="viridis" />
  <Labs
    title="Old Faithful erupts two ways"
    subtitle="272 eruptions counted into a grid of cells: short then soon, or long then late"
    x="Eruption length (minutes)"
    y="Wait for the next eruption (minutes)"
    fill="Eruptions"
  />
  <GeomBin2d bins={16} />
</GGPlot>
