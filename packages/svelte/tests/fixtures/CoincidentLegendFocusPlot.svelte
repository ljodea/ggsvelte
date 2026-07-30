<script lang="ts">
  import { createPlotInteraction, GGPlot } from "../../src/lib/index.js";
  import GuideLegend from "../../src/lib/guides/GuideLegend.svelte";

  const scope = { keys: "row-id" } as const;
  const rows = [
    { id: "a", x: 1, y: 4, group: "north" },
    { id: "b", x: 2, y: 2, group: "south" },
    { id: "c", x: 3, y: 3, group: "north" },
  ];
  const interaction = createPlotInteraction<string>();
</script>

<button
  type="button"
  data-external-focus
  onclick={() => interaction.setEmphasis(["a", "c"], { scope })}
>
  Focus north externally
</button>
<button
  type="button"
  data-external-clear
  onclick={() => interaction.clearEmphasis({ scope })}
>
  Clear external focus
</button>

<div data-coincident-legend-plot>
  <GGPlot
    data={rows}
    aes={{ x: "x", y: "y", color: "group", fill: "group" }}
    layers={[{ geom: "point" }]}
    key="id"
    inspect
    {interaction}
    interactionScope={scope}
    width={420}
    height={280}
    ariaLabel="Coincident color and fill legends"
  >
    <GuideLegend channel="color" focus />
    <GuideLegend channel="fill" focus />
  </GGPlot>
</div>
