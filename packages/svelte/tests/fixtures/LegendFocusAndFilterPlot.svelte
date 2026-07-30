<script lang="ts">
  import { GGPlot, GuideLegend } from "../../src/lib/index.js";

  const rows = [
    { id: "a", x: 1, y: 1, group: "north" },
    { id: "b", x: 2, y: 2, group: "south" },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "group" }}
  layers={[{ geom: "point" }]}
  key="id"
  width={360}
  height={260}
>
  <GuideLegend channel="color" focus filter />
</GGPlot>
