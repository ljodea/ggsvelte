<script lang="ts">
  /**
   * Unovis multi-series line — wide-form rows + array of y accessors
   * (Unovis's idiomatic multi-line path). Colors are stable by series index.
   */
  import { VisXYContainer, VisLine, VisAxis } from "@unovis/svelte";

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
  // Accessors closed over stable series names (fixed at mount for a case).
  const y = names.map((name) => (d: WideRow) => d[name] ?? 0);
  const color = (_d: WideRow, i: number) => COLORS[i % COLORS.length]!;
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <VisXYContainer data={rows} {width} {height}>
    <VisLine {x} {y} {color} lineWidth={1.5} />
    <VisAxis type="x" />
    <VisAxis type="y" />
  </VisXYContainer>
</div>
