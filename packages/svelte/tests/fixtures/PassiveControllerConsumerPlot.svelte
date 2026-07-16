<script lang="ts">
  import { createPlotInteraction, GGPlot } from "../../src/lib/index.js";

  const scope = { keys: "row-id", x: "x-value", y: "y-value" } as const;
  const xy = { x: "x", y: "y" } as const;
  const pointLayers = [{ geom: "point" as const }];
  const rows = [
    { id: "a", x: 1, y: 4 },
    { id: "b", x: 2, y: 2 },
    { id: "c", x: 3, y: 3 },
  ];
  let transitions = $state(0);
  let rendersPassive = $state(0);
  const interaction = createPlotInteraction<string>({
    onchange: () => {
      transitions += 1;
    },
  });
</script>

<div
  data-passive-state
  data-transitions={transitions}
  data-renders-passive={rendersPassive}
>
  <button
    type="button"
    data-select-a
    onclick={() => interaction.setSelection(["a"], { scope })}>Select A</button
  >
  <button
    type="button"
    data-zoom-xy
    onclick={() =>
      interaction.setZoom({ x: [1.2, 2.8], y: [1.5, 3.5] }, { scope })}
    >Zoom xy</button
  >
  <button
    type="button"
    data-select-after-zoom
    onclick={() => interaction.setSelection(["b"], { scope })}
    >Select B after zoom</button
  >

  <!-- Publisher: can select points and zoom on both axes. -->
  <div data-plot-publisher>
    <GGPlot
      data={rows}
      aes={xy}
      layers={pointLayers}
      key="id"
      select="point"
      zoom={true}
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Publisher plot"
    />
  </div>

  <!-- Passive consumer: linked selection only; no select/inspect tools. -->
  <div data-plot-passive>
    <GGPlot
      data={rows}
      aes={xy}
      layers={pointLayers}
      key="id"
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Passive controller consumer"
      onrender={() => {
        rendersPassive += 1;
      }}
    />
  </div>

  <!-- X-only zoom consumer: must not adopt shared y domains. -->
  <div data-plot-x-only>
    <GGPlot
      data={rows}
      aes={xy}
      layers={pointLayers}
      key="id"
      inspect={true}
      zoom={{ mode: "x" }}
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="X-only zoom consumer"
    />
  </div>

  <!-- Interactive inspect-only: must not offer Clear selection. -->
  <div data-plot-inspect-only>
    <GGPlot
      data={rows}
      aes={xy}
      layers={pointLayers}
      key="id"
      inspect={true}
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Inspect-only linked plot"
    />
  </div>
</div>
