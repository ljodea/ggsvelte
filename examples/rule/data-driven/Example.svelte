<script lang="ts">
  import { GeomRule, GGPlot } from "ggsvelte";

  import { eruptions } from "./data.js";
</script>

<GGPlot
  data={eruptions}
  aes={{ x: "waiting" }}
  labs={{
    title: "Waiting times between eruptions",
    subtitle: "One data-driven rule per observation",
    x: "Waiting time (minutes)",
  }}
  width={640}
  height={400}
>
  <GeomRule alpha={0.35} linewidth={1.5} />
</GGPlot>
