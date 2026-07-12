<script lang="ts">
  import { GeomHistogram, GGPlot } from "ggsvelte";

  import { samples } from "./data.js";
</script>

<GGPlot
  data={samples}
  aes={{ x: "ms" }}
  facet={{ wrap: "service", ncol: 3 }}
  labs={{
    title: "Response time by service",
    x: "Response time (ms)",
    y: "Requests",
  }}
  width={640}
  height={400}
>
  <GeomHistogram bins={18} />
</GGPlot>
