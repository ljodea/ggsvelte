<script lang="ts">
  import { GeomRule, GGPlot } from "@ggsvelte/svelte";

  import { longitudeEstimates } from "./data.js";
</script>

<GGPlot
  data={longitudeEstimates}
  aes={{ x: "longitude" }}
  theme="minimal"
  labs={{
    title: "The first statistical graph was a rug",
    subtitle:
      "Van Langren, 1628–1644: 61 estimates of a single fixed distance, spread across thirteen degrees",
    x: "Estimated distance (degrees of longitude)",
  }}
  width={640}
  height={400}
>
  <GeomRule alpha={0.35} linewidth={1.5} />
</GGPlot>
