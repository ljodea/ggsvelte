<script lang="ts">
  import { GGPlot, Theme } from "@ggsvelte/svelte";

  const spec = { layers: [{ geom: "point" as const }] };
</script>

<GGPlot {spec}>
  <Theme name="tufte" />
</GGPlot>
