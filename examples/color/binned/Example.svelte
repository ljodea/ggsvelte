<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    GuideColorsteps,
    Labs,
    ScaleColorBinned,
    ThemeLight,
  } from "@ggsvelte/svelte";

  import { jevonsTrials } from "./data.js";
</script>

<GGPlot
  data={jevonsTrials}
  aes={{ x: "actual", y: "estimated", color: "trials" }}
  width={640}
  height={400}
>
  <ThemeLight />
  <ScaleColorBinned
    breaks={[0, 5, 20, 60, 130]}
    range={["#d3d3d0", "#8ba89c", "#4f8a6e", "#1e5c43"]}
  />
  <GuideColorsteps channel="color" position="bottom" direction="horizontal" />
  <Labs
    title="How many beans can you see at once?"
    subtitle="Jevons threw beans into a box 1,027 times — never wrong up to four"
    x="Beans actually thrown"
    y="Beans estimated"
    color="Trials"
  />
  <GeomPoint size={5} />
</GGPlot>
