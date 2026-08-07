<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Inspect,
    Labs,
    ScaleColorHue,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { armadaSquadrons } from "./data.js";
</script>

<GGPlot
  data={armadaSquadrons}
  aes={{ x: "ships", y: "men", color: "squadron" }}
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <ThemeMinimal />
  <ScaleColorHue />
  <Labs
    title="Scatter coloured by discrete group"
    subtitle="Ten squadrons by ships and men aboard; each squadron gets its own hue"
    x="Ships"
    y="Soldiers and sailors"
    color="Squadron"
  />
  <GeomPoint size={5} />
</GGPlot>
