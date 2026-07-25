<script lang="ts">
  import { GeomPoint, GeomSegment, GGPlot } from "@ggsvelte/svelte";

  import { darwinMaize } from "./data.js";
</script>

<GGPlot
  data={darwinMaize}
  aes={{ x: "pair", y: "self", xend: "pair", yend: "cross", color: "winner" }}
  theme="classic"
  scales={{
    color: {
      type: "manual",
      domain: ["Cross-fertilised taller", "Self-fertilised taller"],
      range: ["#3a7d44", "#bc5215"],
    },
  }}
  labs={{
    title: "Darwin's maize, 1876",
    subtitle: "Fifteen pairs grown side by side; the segment runs self → cross",
    x: "Pair",
    y: "Final height (inches)",
    color: "",
  }}
  width={640}
  height={400}
>
  <GeomSegment linewidth={2} lineend="round" alpha={0.9} />
  <GeomPoint size={2.5} alpha={0.6} />
  <GeomPoint aes={{ x: "pair", y: "cross" }} size={3.2} />
</GGPlot>
