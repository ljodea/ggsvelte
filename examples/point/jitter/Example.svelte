<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { drinksWages } from "./data.js";
</script>

<GGPlot
  data={drinksWages}
  aes={{ x: "wageClass", y: "wage" }}
  theme="clean"
  labs={{
    title: "Wages across 70 trades, 1910",
    subtitle: "Jitter separates trades that share a wage class",
    x: "Wage class",
    y: "Weekly wage (shillings)",
  }}
  width={640}
  height={400}
>
  <GeomPoint
    position="jitter"
    positionParams={{ width: 0.22, height: 0 }}
    alpha={0.75}
  />
</GGPlot>
