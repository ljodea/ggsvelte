<script lang="ts">
  import {
    GeomQq,
    GGPlot,
    Inspect,
    Labs,
    ThemeMinimal,
  } from "@ggsvelte/svelte";

  import { shortSample } from "./data.js";
</script>

<GGPlot data={shortSample} aes={{ sample: "value" }} width={640} height={400}>
  <Inspect mode="xy" pin maxDistance={24} />
  <ThemeMinimal />
  <Labs
    title="Sparse Q–Q cloud"
    subtitle="Twelve sample quantiles against the theoretical normal"
    x="Theoretical quantile"
    y="Sample quantile"
  />
  <GeomQq size={6} alpha={0.95} aes={{ color: { value: "#1a202c" } }} />
</GGPlot>
