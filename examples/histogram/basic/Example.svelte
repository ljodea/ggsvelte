<script lang="ts">
  import { GeomHistogram, GGPlot } from "ggsvelte";

  import { responses } from "./data.js";
</script>

<GGPlot
  data={responses}
  aes={{ x: "ms" }}
  labs={{
    title: "Response time distribution",
    x: "Response time (ms)",
    y: "Count",
  }}
  width={640}
  height={400}
>
  <GeomHistogram binwidth={20} boundary={0} />
</GGPlot>
