<script lang="ts">
  import {
    GeomLine,
    GGPlot,
    Labs,
    ThemeFivethirtyeight,
  } from "@ggsvelte/svelte";

  import { britishExports } from "./data.js";
</script>

<GGPlot
  data={britishExports}
  aes={{ x: "year", y: "value" }}
  width="container"
  height={400}
>
  <ThemeFivethirtyeight />
  <Labs
    title="British and Irish exports, 1855–1899"
    subtitle="Raw four-digit strings infer a calendar scale"
    x="Year"
    y="£ millions"
  />
  <GeomLine linewidth={1.5} />
</GGPlot>
