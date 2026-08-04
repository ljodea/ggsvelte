<script lang="ts">
  import { Plot, BarY, GridX, GridY } from "svelteplot";

  type Row = { category: string; value: number; stack: string };
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
  <!-- Genuinely stacked: BarY applies stackY by default (dist/marks/BarY.svelte),
       grouping layers by the fill channel. x gets a band scale automatically
       (BarY declares requiredScales x: ['band']). Colors come from svelteplot's
       default categorical range — same posture as the scatter/line fixtures. -->
  <BarY data={rows} x="category" y="value" fill="stack" />
</Plot>
