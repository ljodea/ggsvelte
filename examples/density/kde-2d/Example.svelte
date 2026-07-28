<script lang="ts">
  import {
    CoordFixed,
    GeomDensity2d,
    GeomPoint,
    GGPlot,
    Labs,
    ScaleXContinuous,
    ScaleYContinuous,
    ThemeClassic,
  } from "@ggsvelte/svelte";

  import { choleraDeaths, waterPumps } from "./data.js";
</script>

<GGPlot data={choleraDeaths} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <ThemeClassic />
  <CoordFixed />
  <ScaleXContinuous breaks={[8, 10, 12, 14, 16, 18]} />
  <ScaleYContinuous breaks={[6, 8, 10, 12, 14, 16, 18]} />
  <Labs
    title="Snow's cholera deaths close on one pump"
    subtitle="578 deaths in Soho, September 1854; red crosses are the 13 public pumps"
    x="Map east"
    y="Map north"
  />
  <GeomPoint alpha={0.45} size={1.8} />
  <GeomDensity2d
    bins={6}
    n={48}
    linewidth={1}
    aes={{ color: { value: "#1d4ed8" } }}
  />
  <GeomPoint
    data={waterPumps}
    aes={{ x: "x", y: "y", color: { value: "#b91c1c" } }}
    size={4}
    shape="cross"
  />
</GGPlot>
