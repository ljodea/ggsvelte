<script lang="ts">
  import { createPlotInteraction, GGPlot } from "../../src/lib/index.js";

  const scope = { keys: "row-id" } as const;
  const otherScope = { keys: "other-row-id" } as const;
  const mapping = { x: "x", y: "y", color: "group" } as const;
  const rows = [
    { id: "a", x: 1, y: 4, group: "north" },
    { id: "b", x: 2, y: 2, group: "south" },
    { id: "c", x: 3, y: 3, group: "north" },
  ];
  const interaction = createPlotInteraction<string>({
    onchange: () => (transitions += 1),
  });
  let transitions = $state(0);
  let callbacksA = $state(0);
  let callbacksB = $state(0);
  let callbacksC = $state(0);
  let rendersA = $state(0);
  let rendersB = $state(0);
  let rendersC = $state(0);
  const emphasized = $derived(interaction.emphasized(scope));
</script>

<div
  data-legend-state
  data-transitions={transitions}
  data-callbacks-a={callbacksA}
  data-callbacks-b={callbacksB}
  data-callbacks-c={callbacksC}
  data-renders-a={rendersA}
  data-renders-b={rendersB}
  data-renders-c={rendersC}
  data-emphasized={emphasized.join(",")}
>
  <div data-plot-a>
    <GGPlot
      data={rows}
      aes={mapping}
      layers={[{ geom: "point" }]}
      key="id"
      legendFocus
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Legend focus plot A"
      onlegendfocus={() => (callbacksA += 1)}
      onrender={() => (rendersA += 1)}
    />
  </div>
  <div data-plot-b>
    <GGPlot
      data={rows}
      aes={mapping}
      layers={[{ geom: "point", render: "canvas" }]}
      key="id"
      legendFocus
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Legend focus plot B"
      onlegendfocus={() => (callbacksB += 1)}
      onrender={() => (rendersB += 1)}
    />
  </div>
  <div data-plot-c>
    <GGPlot
      data={rows}
      aes={mapping}
      layers={[{ geom: "point" }]}
      key="id"
      legendFocus
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Legend focus plot C"
      onlegendfocus={() => (callbacksC += 1)}
      onrender={() => (rendersC += 1)}
    />
  </div>
  <div data-plot-other>
    <GGPlot
      data={rows}
      aes={mapping}
      layers={[{ geom: "point" }]}
      key="id"
      legendFocus
      {interaction}
      interactionScope={otherScope}
      width={360}
      height={260}
      ariaLabel="Mismatched legend focus plot"
    />
  </div>
</div>
