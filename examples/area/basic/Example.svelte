<script lang="ts">
  import { GeomArea, GeomLine, GGPlot } from "@ggsvelte/svelte";

  import { halleyLifeTable } from "./data.js";
</script>

<GGPlot
  data={halleyLifeTable}
  aes={{ x: "age", y: "survivors" }}
  theme="classic"
  scales={{
    x: { breaks: [1, 10, 20, 30, 40, 50, 60, 70, 80], nice: false },
    y: { breaks: [0, 200, 400, 600, 800, 1000] },
  }}
  labs={{
    title: "Halley's life table, 1693",
    subtitle: "Survivors from a cohort of 1,000 born in Breslau",
    x: "Age",
    y: "Surviving",
  }}
  width={640}
  height={400}
>
  <GeomArea alpha={0.7} />
  <GeomLine linewidth={1.5} />
</GGPlot>
