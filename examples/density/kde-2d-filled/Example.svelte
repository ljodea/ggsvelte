<script lang="ts">
  import {
    CoordFixed,
    GeomDensity2dFilled,
    GeomPoint,
    GGPlot,
    Inspect,
    Labs,
    ScaleColorManual,
    ThemeMap,
  } from "@ggsvelte/svelte";

  import { choleraDeaths, waterPumps } from "./data.js";
</script>

<GGPlot data={choleraDeaths} aes={{ x: "x", y: "y" }} width={640} height={400}>
  <GeomDensity2dFilled bins={6} n={48} alpha={0.8} />
  <GeomPoint
    alpha={0.55}
    size={1.6}
    aes={{ color: { value: "Deaths", scale: true } }}
  />
  <GeomPoint
    data={waterPumps}
    aes={{ x: "x", y: "y", color: { value: "Pumps", scale: true } }}
    size={4}
    shape="cross"
  />
  <ScaleColorManual
    domain={["Deaths", "Pumps"]}
    values={["#1e293b", "#b91c1c"]}
  />
  <CoordFixed />
  <ThemeMap />
  <Labs
    title="Filled density bands over points"
    subtitle="Darker rings mark denser streets; the peak sits on Broad Street"
    x=""
    y=""
    fill="Density"
    color=""
  />
  <Inspect mode="xy" pin maxDistance={24} />
</GGPlot>
