<script lang="ts">
  // @ts-nocheck — historical GGPlot scales prop (removed in 0.13.0)
  import { GeomPoint, GeomSmooth, GGPlot } from "../../src/lib/index.js";

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "latency", y: "throughput" }}
  scales={{ x: { type: "log", domain: [1, 1000] } }}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
</GGPlot>
