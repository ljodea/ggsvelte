<script lang="ts">
  import { GGPlot, type LegendFilterEvent } from "../../src/lib/index.js";

  const {
    backend = "svg",
    mode = "exclude",
    multiple = true,
  }: {
    backend?: "svg" | "canvas";
    mode?: "exclude" | "include";
    multiple?: boolean;
  } = $props();

  const rows = [
    { id: "a", x: 1, y: 4, group: "north" },
    { id: "b", x: 2, y: 2, group: "south" },
    { id: "c", x: 3, y: 3, group: "north" },
  ];
  let renders = $state(0);
  let candidates = $state(0);
  let events = $state<LegendFilterEvent[]>([]);
  let interactionEvents = $state<string[]>([]);
  let colors = $state("");
</script>

<div
  data-legend-filter-state
  data-renders={renders}
  data-candidates={candidates}
  data-events={JSON.stringify(events)}
  data-interaction-events={JSON.stringify(interactionEvents)}
  data-colors={colors}
>
  <GGPlot
    data={rows}
    aes={{ x: "x", y: "y", color: "group" }}
    layers={[{ geom: "point", render: backend }]}
    legendFilter={{ mode, multiple }}
    width={360}
    height={260}
    ariaLabel="Legend filter plot"
    onlegendfilter={(event) => (events = [...events, event])}
    oninteraction={(event) =>
      (interactionEvents = [...interactionEvents, event.type])}
    onrender={(model) => {
      renders += 1;
      candidates = 0;
      for (let index = 0; index < model.candidates.size; index++)
        if (model.candidates.candidate(index) !== null) candidates += 1;
      const legend = model.scene.legends.find(
        (candidate) => candidate.type === "discrete",
      );
      colors =
        legend?.type === "discrete"
          ? legend.entries.map((entry) => entry.color).join(",")
          : "";
    }}
  />
</div>
