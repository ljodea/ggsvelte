<script lang="ts">
  import { GeomPoint, GeomSmooth, GGPlot } from "../../src/lib/index.js";

  // Historical pre-0.13 GGPlot grammar prop (removed). Cast for typecheck.
  /* oxlint-disable-next-line typescript/no-explicit-any -- intentional pre-removal fixture */
  const Plot = GGPlot as any;

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<Plot
  data={rows}
  aes={{ x: "latency", y: "throughput" }}
  scales={{ x: { type: "log", domain: [1, 1000] } }}
>
  <GeomPoint />
  <GeomSmooth method="lm" />
</Plot>
