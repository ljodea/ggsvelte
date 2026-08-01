<script lang="ts">
  import { GeomPoint, GGPlot, Labs, ThemeClean } from "@ggsvelte/svelte";

  import { fastfoodMenu } from "./data.js";
</script>

<GGPlot
  data={fastfoodMenu}
  aes={{ x: "restaurant", y: "calories" }}
  width={640}
  height={400}
>
  <ThemeClean />
  <Labs
    title="The same calories, with position jitter"
    subtitle="position_jitter on geom_point instead of the dedicated jitter geom"
    x="Restaurant"
    y="Calories"
  />
  <GeomPoint
    position="jitter"
    positionParams={{ width: 0.22, height: 0 }}
    alpha={0.65}
  />
</GGPlot>
