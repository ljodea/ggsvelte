<script lang="ts">
  import {
    GeomPoint,
    GeomVline,
    GGPlot,
    Inspect,
    Labs,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { earthDensity } from "./data.js";
</script>

<GGPlot
  data={earthDensity}
  aes={{ x: "trial", y: "density" }}
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <ThemeMinimal />
  <Labs
    title="One vertical cutoff"
    subtitle="Determinations in reported order; the rule marks the trial after which the wire changed"
    x="Determination"
    y="Density of the earth (water = 1)"
  />
  <GeomPoint size={2.2} alpha={0.55} />
  <GeomVline
    xintercept={6.5}
    linewidth={2.6}
    aes={{ color: { value: "#d4615c" } }}
  />
</GGPlot>
