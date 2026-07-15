<script lang="ts">
  import { GeomArea, GeomLine, GGPlot } from "@ggsvelte/svelte";

  import { rainfall } from "./data.js";
</script>

<GGPlot
  data={rainfall}
  aes={{ x: "month", y: "mm" }}
  scales={{
    x: { breaks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], nice: false },
  }}
  labs={{ title: "Monthly rainfall", x: "Month", y: "Rainfall (mm)" }}
  width={640}
  height={400}
>
  <GeomArea alpha={0.7} />
  <GeomLine linewidth={1.5} />
</GGPlot>
