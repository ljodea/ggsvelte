<script lang="ts">
  import { coordFixed, GGPlot, GeomLine } from "../../src/lib/index.js";

  // Since 0.9, constrain the measured data rectangle instead of the outer box.
  const circle = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
  ];
</script>

<GGPlot data={circle} aes={{ x: "x", y: "y" }} coord={coordFixed()}>
  <GeomLine />
</GGPlot>
