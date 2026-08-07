<script lang="ts">
  import { GGPlot, Inspect } from "@ggsvelte/svelte";
  import spec from "./spec.js";
</script>

<GGPlot {spec} width={640} height={360}>
  <Inspect mode="x" pin />
</GGPlot>
