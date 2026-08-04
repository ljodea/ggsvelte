<script lang="ts">
  import { Plot, Line, GridX, GridY } from "svelteplot";

  type Row = { x: number; y: number; series: string };
  let {
    rows: initialRows,
    width,
    height,
  }: { rows: Row[]; width: number; height: number } = $props();
  // Plain-props mount (zero proxy cost); updates flow through the exported
  // setRows — component exports land on the object returned by svelte's
  // mount(). $state.raw: 30k-row datasets must NOT be deep-proxied.
  let rows = $state.raw(initialRows);
  export function setRows(next: Row[]) {
    rows = next;
  }
</script>

<Plot {width} {height}>
  <GridX />
  <GridY />
  <Line data={rows} x="x" y="y" stroke="series" strokeWidth={1.5} />
</Plot>
