<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorSteps,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { londonDistricts } from "./data.js";
</script>

<GGPlot
  data={londonDistricts}
  aes={{ x: "elevation", y: "deathRate", color: "poorRate" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleColorSteps low="#132B43" high="#56B1F7" />
  <Labs
    title="Cholera fell away with height above the Thames"
    subtitle="38 London districts in 1849, shaded in bands by their poor rate"
    x="Elevation above high water (feet)"
    y="Cholera deaths per 10,000"
    color="Poor rate"
  />
  <GeomPoint size={4} />
</GGPlot>
