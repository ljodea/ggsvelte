<script lang="ts">
  import { GGPlot, Labs } from "../../src/lib/index.js";

  const rows = [
    { id: "a", x: 1, y: 4, group: "north", region: "west" },
    { id: "b", x: 2, y: 2, group: "south", region: "east" },
    { id: "c", x: 3, y: 3, group: "north", region: "east" },
  ];
</script>

<GGPlot
  data={rows}
  aes={{ x: "x", y: "y", color: "group", fill: "region" }}
  layers={[{ geom: "point" }]}
  key="id"
  legendFocus
  width={420}
  height={280}
  ariaLabel="Legend clear geometry plot"
>
  <Labs
    title="Legend recovery geometry"
    subtitle="The recovery action stays outside chart chrome."
    color="Group"
    fill="Region"
  />
</GGPlot>
