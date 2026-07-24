<script lang="ts">
  import { GeomHistogram, GeomRule, GGPlot } from "@ggsvelte/svelte";

  import { michelson } from "./data.js";
</script>

<GGPlot
  data={michelson}
  aes={{ x: "velocity" }}
  theme="fivethirtyeight"
  labs={{
    title: "Michelson measures the speed of light, 1879",
    subtitle:
      "100 runs, km/s less 299,000 — the true value sits off the centre",
    x: "Velocity (km/s − 299,000)",
    y: "Runs",
  }}
  width={640}
  height={400}
>
  <GeomHistogram binwidth={40} />
  <GeomRule
    xintercept={734.5}
    linewidth={1.2}
    aes={{ color: { value: "#d14d41" } }}
  />
</GGPlot>
