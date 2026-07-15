<script lang="ts">
  import { createPlotInteraction, GGPlot } from "../../src/lib/index.js";

  const scope = { keys: "row-id", x: "x-value", y: "y-value" } as const;
  const otherScope = { keys: "other-id", x: "other-x", y: "other-y" } as const;
  const xy = { x: "x", y: "y" } as const;
  const xyGroup = { x: "x", y: "y", color: "group" } as const;
  const pointLayers = [{ geom: "point" as const }];
  let transitions = $state(0);
  let callbacksA = $state(0);
  let callbacksB = $state(0);
  let rendersA = $state(0);
  let rendersB = $state(0);
  let rendersOther = $state(0);
  let rows = $state([
    { id: "a", x: 1, y: 4, group: "north" },
    { id: "b", x: 2, y: 2, group: "south" },
    { id: "c", x: 3, y: 3, group: "north" },
  ]);
  const interaction = createPlotInteraction<string>({
    onchange: () => {
      transitions += 1;
    },
  });
  const selected = $derived(interaction.selected(scope));
  const emphasized = $derived(interaction.emphasized(scope));

  function replaceAndReconcile(): void {
    rows = rows.filter((row) => row.id !== "c");
    interaction.reconcileKeys(
      rows.map((row) => row.id),
      { scope },
    );
  }

  function selectA(): void {
    callbacksA += 1;
  }

  function selectB(): void {
    callbacksB += 1;
  }

  function renderA(): void {
    rendersA += 1;
  }

  function renderB(): void {
    rendersB += 1;
  }

  function renderOther(): void {
    rendersOther += 1;
  }
</script>

<div
  data-controller-state
  data-transitions={transitions}
  data-callbacks-a={callbacksA}
  data-callbacks-b={callbacksB}
  data-renders-a={rendersA}
  data-renders-b={rendersB}
  data-renders-other={rendersOther}
>
  <button
    type="button"
    data-select-b
    aria-pressed={selected.includes("b")}
    onclick={() => interaction.setSelection(["b"], { scope })}>Select B</button
  >
  <button
    type="button"
    data-emphasize-c
    aria-pressed={emphasized.includes("c")}
    onclick={() => interaction.setEmphasis(["c"], { scope })}
    >Emphasize C</button
  >
  <button
    type="button"
    data-zoom-x
    onclick={() => interaction.setZoom({ x: [1.5, 2.5] }, { scope })}
    >Zoom x</button
  >
  <button type="button" data-replace onclick={replaceAndReconcile}
    >Replace data</button
  >
  <button
    type="button"
    data-clear
    onclick={() => {
      interaction.clearSelection({ scope });
      interaction.clearEmphasis({ scope });
    }}>Clear</button
  >

  <div data-plot-a>
    <GGPlot
      data={rows}
      aes={xy}
      layers={pointLayers}
      key="id"
      select="point"
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Linked plot A"
      onselect={selectA}
      onrender={renderA}
    />
  </div>
  <div data-plot-b>
    <GGPlot
      data={rows}
      aes={xyGroup}
      layers={pointLayers}
      key="id"
      select="point"
      {interaction}
      interactionScope={scope}
      width={360}
      height={260}
      ariaLabel="Linked plot B"
      onselect={selectB}
      onrender={renderB}
    />
  </div>
  <div data-plot-other>
    <GGPlot
      data={rows}
      aes={xy}
      layers={pointLayers}
      key="id"
      select="point"
      {interaction}
      interactionScope={otherScope}
      width={360}
      height={260}
      ariaLabel="Mismatched scope plot"
      onrender={renderOther}
    />
  </div>

  <p role="status" aria-live="polite">
    {selected.length} selected; {emphasized.length} emphasized; {transitions} transitions
  </p>
  <table>
    <caption>Linked rows</caption>
    <thead><tr><th>id</th><th>x</th><th>y</th></tr></thead>
    <tbody>
      {#each rows as row (row.id)}
        <tr
          data-row={row.id}
          aria-selected={selected.includes(row.id)}
          data-emphasized={emphasized.includes(row.id)}
        >
          <th scope="row">{row.id}</th><td>{row.x}</td><td>{row.y}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
