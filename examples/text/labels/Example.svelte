<script lang="ts">
  import { GeomPoint, GeomText, GGPlot } from "@ggsvelte/svelte";

  import { cities } from "./data.js";
</script>

<GGPlot
  data={cities}
  aes={{ x: "rent", y: "livability" }}
  scales={{ x: { labels: ",d" } }}
  labs={{
    title: "Livability vs median rent",
    x: "Median monthly rent (USD)",
    y: "Livability index",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={3} />
  <GeomText aes={{ label: "city" }} dy={-9} size={10} />
</GGPlot>
