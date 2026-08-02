<script lang="ts">
  import {
    GeomJitter,
    GGPlot,
    Labs,
    ScaleXDiscrete,
    ScaleYContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { sparseGroups } from "./data.js";
</script>

<GGPlot
  data={sparseGroups}
  aes={{ x: "group", y: "value" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleXDiscrete domain={["A", "B", "C"]} />
  <ScaleYContinuous limits={[0, 10]} />
  <Labs
    title="Jittered points by group"
    subtitle="Twelve large points; width jitter spreads stacks that share a category"
    x="Group"
    y="Value"
  />
  <GeomJitter
    width={0.35}
    height={0}
    seed={7}
    size={6.5}
    alpha={0.9}
    aes={{ color: { value: "#1a202c" } }}
  />
</GGPlot>
