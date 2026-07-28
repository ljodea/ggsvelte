<script lang="ts">
  import { GeomPoint, GGPlot, Labs, ThemeClean } from "@ggsvelte/svelte";

  import { drinksWages } from "./data.js";
</script>

<GGPlot
  data={drinksWages}
  aes={{ x: "wageClass", y: "wage" }}
  width={640}
  height={400}
>
  <ThemeClean />
  <Labs
    title="The same wages, jittered by position"
    subtitle="Pearson's 70 trades again, spread by position_jitter rather than the geom sugar"
    x="Wage class"
    y="Weekly wage (shillings)"
  />
  <GeomPoint
    position="jitter"
    positionParams={{ width: 0.22, height: 0 }}
    alpha={0.75}
  />
</GGPlot>
