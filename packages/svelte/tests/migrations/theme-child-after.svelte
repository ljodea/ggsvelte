<script lang="ts">
  import { GeomPoint, GGPlot, ThemeDark } from "../../src/lib/index.js";

  const rows = [
    { x: 1, y: 2 },
    { x: 2, y: 4 },
  ];
</script>

<!-- After 0.11: compose the theme as a declaration-only child layer. -->
<GGPlot data={rows} aes={{ x: "x", y: "y" }}>
  <ThemeDark />
  <GeomPoint />
</GGPlot>
