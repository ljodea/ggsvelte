<script lang="ts">
  import { GeomBoxplot, GGPlot } from "@ggsvelte/svelte";

  import { michelsonRuns } from "./data.js";
</script>

<GGPlot
  data={michelsonRuns}
  aes={{ x: "run", y: "velocity" }}
  theme="few"
  scales={{ x: { domain: ["Jun 5", "Jun 7", "Jun 9", "Jun 12", "Jul 2"] } }}
  labs={{
    title: "Michelson's five runs, 1879",
    subtitle:
      "Twenty measurements each — the runs disagree more than the readings within them",
    x: "Run",
    y: "Velocity (km/s − 299,000)",
  }}
  width={640}
  height={400}
>
  <GeomBoxplot />
</GGPlot>
