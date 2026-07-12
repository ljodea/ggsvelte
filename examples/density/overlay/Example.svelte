<script lang="ts">
  import { GeomDensity, GGPlot } from "ggsvelte";

  import { sessions } from "./data.js";
</script>

<GGPlot
  data={sessions}
  aes={{ x: "minutes", fill: "cohort" }}
  labs={{
    title: "Session length by cohort",
    x: "Session length (minutes)",
    y: "Density",
    fill: "Cohort",
  }}
  width={640}
  height={400}
>
  <GeomDensity alpha={0.45} />
</GGPlot>
