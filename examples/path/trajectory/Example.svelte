<script lang="ts">
  import {
    GeomPath,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorManual,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { napoleonsArmy } from "./data.js";
</script>

<GGPlot
  data={napoleonsArmy}
  aes={{ x: "long", y: "survivors", group: "leg", color: "direction" }}
  width={640}
  height={400}
>
  <ThemeClassic />
  <ScaleColorManual
    domain={["Advance", "Retreat"]}
    values={["#b45309", "#1f2937"]}
  />
  <Labs
    title="Napoleon's army marches east and dies coming back"
    subtitle="Minard's 1812 strength counts, drawn in march order: out to Moscow, then home"
    x="Longitude east"
    y="Men still with the column"
    color=""
  />
  <GeomPath linewidth={2} />
  <GeomPoint size={2.2} alpha={0.7} />
</GGPlot>
