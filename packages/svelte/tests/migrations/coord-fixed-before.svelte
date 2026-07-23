<script lang="ts">
  import { GGPlot, GeomLine } from "../../src/lib/index.js";

  // Before 0.9, an outer CSS aspect ratio could not preserve data-unit lengths
  // after axes, titles, and guides consumed chart space.
  const circle = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
  ];
</script>

<div style="aspect-ratio: 1">
  <GGPlot data={circle} aes={{ x: "x", y: "y" }}>
    <GeomLine />
  </GGPlot>
</div>
