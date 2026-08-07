<script lang="ts">
  import {
    GeomPoint,
    GGPlot,
    Inspect,
    Labs,
    ThemeClean,
  } from "@ggsvelte/svelte";

  import { fastfoodMenu } from "./data.js";
</script>

<GGPlot
  data={fastfoodMenu}
  aes={{ x: "restaurant", y: "calories" }}
  width={640}
  height={400}
>
  <Inspect mode="xy" pin maxDistance={24} />
  <ThemeClean />
  <Labs
    title="The same calories, with position jitter"
    subtitle="Jitter applied through the point position, not the dedicated jitter geom"
    x="Restaurant"
    y="Calories"
  />
  <GeomPoint
    position="jitter"
    positionParams={{ width: 0.22, height: 0 }}
    alpha={0.65}
  />
</GGPlot>
