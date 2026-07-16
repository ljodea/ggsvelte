<script lang="ts">
  import { GGPlot } from "../../src/lib/index.js";

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
  labs={{
    title: "Legend recovery geometry",
    subtitle: "The recovery action stays outside chart chrome.",
    color: "Group",
    fill: "Region",
  }}
  ariaLabel="Legend clear geometry plot"
/>
