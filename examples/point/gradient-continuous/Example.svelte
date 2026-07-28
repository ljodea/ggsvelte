<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Labs,
    ScaleColorGradient,
    ScaleXContinuous,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { parisRegister } from "./data.js";
</script>

<GGPlot
  data={parisRegister}
  aes={{ x: "month", y: "registered", color: "year" }}
  width={640}
  height={400}
>
  <ThemeMinimal />
  <ScaleColorGradient low="#132B43" high="#56B1F7" />
  <ScaleXContinuous breaks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]} />
  <Labs
    title="Forty-three years of one register, stacked by month"
    subtitle="Paris, 1812 to 1854; the ramp is the only thing separating the years"
    x="Month"
    y="Women on the register"
    color="Year"
  />
  <GeomPoint size={2.6} alpha={0.85} />
</GGPlot>
