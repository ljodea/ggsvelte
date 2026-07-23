<script lang="ts">
  import { GGPlot } from "@ggsvelte/svelte";
  import spec from "./spec.js";
</script>

<GGPlot {spec} width={640} height={360} />
