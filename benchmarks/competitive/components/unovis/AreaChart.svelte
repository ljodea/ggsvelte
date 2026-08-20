<script lang="ts">
  /**
   * Unovis multi-series area — IDENTITY (overlaid), not stacked.
   *
   * Unovis VisArea stacks when given an array of y accessors; competitors in
   * this suite draw overlaid areas (#1357 fairness). One VisArea per series
   * keeps each band independent, matching D3/Chart.js/ECharts/uPlot/ggsvelte
   * identity posture.
   */
  import { VisXYContainer, VisArea, VisAxis } from "@unovis/svelte";

  import { COLORS } from "../../scenarios";

  type WideRow = { x: number } & Record<string, number>;

  let {
    rows: initialRows,
    seriesNames,
    width,
    height,
  }: {
    rows: WideRow[];
    seriesNames: string[];
    width: number;
    height: number;
  } = $props();
  // svelte-ignore state_referenced_locally
  let rows = $state.raw(initialRows);
  export function setRows(next: WideRow[]) {
    rows = next;
  }
  // @unovis/svelte sets changed data with preventRender=true. Changing a
  // non-visual container callback makes that wrapper schedule the same chart's
  // render after it has installed the new rows.
  const onRenderComplete = $derived.by(() => {
    void rows;
    return () => {};
  });
  const x = (d: WideRow) => d.x;
  const series = $derived(
    seriesNames.map((name, i) => ({
      name,
      y: (d: WideRow) => d[name] ?? 0,
      color: COLORS[i % COLORS.length]!,
    })),
  );
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <VisXYContainer data={rows} {width} {height} duration={0} {onRenderComplete}>
    {#each series as s (s.name)}
      <VisArea {x} y={s.y} color={s.color} opacity={0.4} duration={0} />
    {/each}
    <VisAxis type="x" duration={0} />
    <VisAxis type="y" duration={0} />
  </VisXYContainer>
</div>
