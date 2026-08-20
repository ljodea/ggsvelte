<script lang="ts">
  /**
   * Unovis stacked bars — wide-form category rows + VisStackedBar with an
   * array of y accessors (one per stack key). x is a dense category index
   * so Unovis's continuous scale stays honest (ordinal guide is optional).
   */
  import { VisXYContainer, VisStackedBar, VisAxis } from "@unovis/svelte";

  import { COLORS } from "../../scenarios";

  type WideRow = { x: number } & Record<string, number>;

  let {
    rows: initialRows,
    stackNames,
    width,
    height,
  }: {
    rows: WideRow[];
    stackNames: string[];
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
  const y = $derived(stackNames.map((name) => (d: WideRow) => d[name] ?? 0));
  const color = (_d: WideRow, i: number) => COLORS[i % COLORS.length]!;
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <VisXYContainer data={rows} {width} {height} duration={0} {onRenderComplete}>
    <VisStackedBar {x} {y} {color} duration={0} />
    <VisAxis type="x" duration={0} />
    <VisAxis type="y" duration={0} />
  </VisXYContainer>
</div>
