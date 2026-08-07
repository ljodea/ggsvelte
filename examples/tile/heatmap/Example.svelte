<script lang="ts">
  import {
    CoordFixed,
    GeomTile,
    GGPlot,
    GuideColorbar,
    Labs,
    ScaleFillContinuous,
    ScaleXDiscrete,
    ScaleYDiscrete,
    ThemeLight,
  } from "@ggsvelte/svelte";

  import { cholera1849 } from "./data.js";
</script>

<!--
  1200×380 (not the default 640×400): a 53-week × 7-day calendar needs a wide,
  short frame so CoordFixed can keep each band cell square and large enough
  to read. Grid is off — incomplete weeks (year start/end) have no tile and
  must not show ghost cell borders. Colorbar sits below so it does not steal
  horizontal tile space. Weekday labels: GitHub-style Mon/Wed/Fri subset.
-->
<GGPlot
  data={cholera1849}
  aes={{ x: "week", y: "weekday", fill: "deaths" }}
  width={1200}
  height={380}
>
  <ThemeLight grid="none" gridX={false} gridY={false} />
  <CoordFixed />
  <ScaleXDiscrete />
  <ScaleYDiscrete
    domain={["Sat", "Fri", "Thu", "Wed", "Tue", "Mon", "Sun"]}
    breaks={["Mon", "Wed", "Fri"]}
  />
  <ScaleFillContinuous scheme="viridis" />
  <GuideColorbar channel="fill" position="bottom" direction="horizontal" />
  <Labs
    title="Cholera in England and Wales, 1849"
    subtitle="Registered deaths every day of the year; 53,293 in all, peaking at 1,121 on 6 September"
    x="Week of 1849"
    y=""
    fill="Deaths"
  />
  <GeomTile />
</GGPlot>
