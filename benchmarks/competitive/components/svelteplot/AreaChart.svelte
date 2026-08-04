<script lang="ts">
  import { Plot, AreaY, GridX, GridY } from "svelteplot";

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
  <!-- IDENTITY position: AreaY implicitly applies stackY only when the y1/y2
       channels are absent (dist/transforms/stack.js stackXY early-returns when
       y1 or y2 is set). Passing an explicit baseline y1=0 + topline y2="y"
       therefore yields overlaid, non-stacked areas — fair vs competitors
       (#1357). -->
  <AreaY data={rows} x="x" y1={0} y2="y" fill="series" fillOpacity={0.4} />
</Plot>
