<script lang="ts">
  import { GGPlot } from "../../src/lib/index.js";

  const rows = [
    { id: "a", x: 1, y: 4, group: "north" },
    { id: "b", x: 2, y: 2, group: "south" },
    { id: "c", x: 3, y: 3, group: "north" },
  ];
  let renders = $state(0);
  let lastEvent = $state("");
</script>

<div data-local-legend-state data-renders={renders} data-last-event={lastEvent}>
  <GGPlot
    data={rows}
    aes={{ x: "x", y: "y", color: "group" }}
    layers={[{ geom: "point" }]}
    key="id"
    legendFocus
    width={360}
    height={260}
    ariaLabel="Local legend focus plot"
    onlegendfocus={(event) => {
      lastEvent = JSON.stringify(event);
    }}
    onrender={() => (renders += 1)}
  />
</div>
