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
    seriesNames: names,
    width,
    height,
  }: {
    rows: WideRow[];
    seriesNames: string[];
    width: number;
    height: number;
  } = $props();
  let rows = $state.raw(initialRows);
  export function setRows(next: WideRow[]) {
    rows = next;
  }

  const x = (d: WideRow) => d.x;
  const series = names.map((name, i) => ({
    name,
    y: (d: WideRow) => d[name] ?? 0,
    color: COLORS[i % COLORS.length]!,
  }));
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <VisXYContainer data={rows} {width} {height}>
    {#each series as s (s.name)}
      <VisArea {x} y={s.y} color={s.color} opacity={0.4} />
    {/each}
    <VisAxis type="x" />
    <VisAxis type="y" />
  </VisXYContainer>
</div>
