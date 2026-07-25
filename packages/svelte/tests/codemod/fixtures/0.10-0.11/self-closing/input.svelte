<script lang="ts">
  import { GGPlot } from "@ggsvelte/svelte";

  const spec = { layers: [{ geom: "point" as const }] };
</script>

<GGPlot {spec} theme="tufte" />
