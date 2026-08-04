<script lang="ts">
  import { Plot, Dot, GridX, GridY } from "svelteplot";

  type Row = { x: number; y: number; cls: string };
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
  <Dot data={rows} x="x" y="y" fill="cls" r={1.5} fillOpacity={0.7} />
</Plot>
