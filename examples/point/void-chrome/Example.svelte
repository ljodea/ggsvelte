<script lang="ts">
  import {
    GeomLine,
    GeomPoint,
    GGPlot,
    Labs,
    ThemeVoid,
  } from "@ggsvelte/svelte";

  import { britishExports } from "./data.js";
</script>

<GGPlot
  data={britishExports}
  aes={{ x: "year", y: "value" }}
  width={640}
  height={400}
>
  <ThemeVoid />
  <Labs
    title="British exports, 1855 to 1899, as a sparkline"
    subtitle="theme_void keeps the marks and drops every axis, tick and grid line"
    x=""
    y=""
  />
  <GeomLine linewidth={1.5} />
  <GeomPoint size={2.4} alpha={0.8} />
</GGPlot>
