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
  const onRenderComplete = $derived.by(() => {
    void rows;
    return () => {};
  });
  const x = (d: WideRow) => d.x;
  // Accessors closed over stable series names (fixed at mount for a case).
  const y = $derived(seriesNames.map((name) => (d: WideRow) => d[name] ?? 0));
  const color = (_d: WideRow, i: number) => COLORS[i % COLORS.length]!;
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <VisXYContainer data={rows} {width} {height} duration={0} {onRenderComplete}>
    <VisLine {x} {y} {color} lineWidth={1.5} duration={0} />
    <VisAxis type="x" duration={0} />
    <VisAxis type="y" duration={0} />
  </VisXYContainer>
</div>
