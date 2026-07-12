<script lang="ts">
  import { GeomPoint, GGPlot } from "ggsvelte";

  import { cloud } from "./data.js";
</script>

<GGPlot
  data={cloud}
  aes={{ x: "x", y: "y", color: "cluster" }}
  labs={{
    title: "10,000 points on a canvas stratum",
    x: "x",
    y: "y",
    color: "Cluster",
  }}
  width={640}
  height={400}
>
  <GeomPoint size={1.2} alpha={0.4} />
</GGPlot>
