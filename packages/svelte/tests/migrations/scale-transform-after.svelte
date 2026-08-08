<script lang="ts">
  import {
    GeomPoint,
    GeomSmooth,
    GGPlot,
    ScaleXLog10,
  } from "../../src/lib/index.js";

  const rows = [
    { latency: 1, throughput: 8 },
    { latency: 10, throughput: 18 },
    { latency: 100, throughput: 31 },
    { latency: 1000, throughput: 47 },
  ];
</script>

<GGPlot data={rows} aes={{ x: "latency", y: "throughput" }}>
  <GeomPoint />
  <GeomSmooth method="lm" />
  <ScaleXLog10
    domain={[1, 1000]}
    oob="censor"
    expand={{ mult: 0, add: 0 }}
    nice={false}
  />
</GGPlot>
