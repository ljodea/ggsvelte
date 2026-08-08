<script lang="ts">
  import {
    GeomPoint,
    GeomRule,
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
  <GeomPoint size={2.2} alpha={0.55} />
  <GeomRule
    xintercept={6.5}
    linewidth={2.2}
    aes={{ color: { value: "#d4615c" } }}
  />
  <GeomRule
    yintercept={5.517}
    linewidth={2.2}
    aes={{ color: { value: "#2f6fed" } }}
  />
  <ThemeMinimal />
  <Labs
    title="A crosshair of two fixed intercepts"
    subtitle="Vertical rule where the apparatus changed; horizontal rule at the modern value"
    x="Determination"
    y="Density of the earth (water = 1)"
  />
  <Inspect mode="xy" pin maxDistance={24} />
</GGPlot>
