<script lang="ts">
  import { GeomCol, GGPlot } from "@ggsvelte/svelte";

  import { chestSizes } from "./data.js";
</script>

<GGPlot
  data={chestSizes}
  aes={{ x: "chest", y: "soldiers" }}
  theme="classic"
  scales={{ x: { nice: false } }}
  labs={{
    title: "Chests of 5,738 Scottish soldiers",
    subtitle:
      "The measurements that made the normal curve a claim about people",
    x: "Chest circumference (inches)",
    y: "Soldiers",
  }}
  width={640}
  height={400}
>
  <GeomCol />
</GGPlot>
