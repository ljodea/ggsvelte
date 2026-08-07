<script lang="ts">
  import {
    CoordFixed,
    GeomSf,
    GGPlot,
    Inspect,
    Labs,
    ScaleFillContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { heightRings } from "./data.js";
</script>

<GGPlot data={heightRings} aes={{ fill: "height" }} width={640} height={400}>
  <Inspect mode="exact" pin />
  <ThemeClassic />
  <CoordFixed />
  <ScaleFillContinuous scheme="viridis" />
  <Labs
    title="Simple features as filled polygons"
    subtitle="Elevation bands on a hill drawn from simple-feature rings"
    fill="Metres"
  />
  <GeomSf alpha={0.55} linewidth={0.9} />
</GGPlot>
