<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
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
  <ThemeMinimal />
  <ScaleColorHue />
  <Labs
    title="How the Armada was loaded"
    subtitle="Ten squadrons, ships against men aboard; the galleys carried theirs in four hulls"
    x="Ships"
    y="Soldiers and sailors"
    color="Squadron"
  />
  <GeomPoint size={5} />
</GGPlot>
