<script lang="ts">
  import {
    GeomPoint,
    GeomSegment,
    GGPlot,
    Inspect,
    Labs,
    ScaleColorManual,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { darwinMaize } from "./data.js";
</script>

<GGPlot
  data={darwinMaize}
  aes={{ x: "pair", y: "self", xend: "pair", yend: "cross", color: "winner" }}
  width={640}
  height={400}
>
  <GeomSegment linewidth={2} lineend="round" alpha={0.9} />
  <GeomPoint size={2.5} alpha={0.6} />
  <GeomPoint aes={{ x: "pair", y: "cross" }} size={3.2} />
  <ScaleColorManual
    domain={["Cross-fertilised taller", "Self-fertilised taller"]}
    values={["#3a7d44", "#bc5215"]}
  />
  <ThemeClassic />
  <Labs
    title="Segments from start to end of each pair"
    subtitle="Each segment runs from the self-fertilised height to the cross-fertilised height"
    x="Pair"
    y="Final height (inches)"
    color=""
  />
  <Inspect mode="xy" pin maxDistance={24} />
</GGPlot>
