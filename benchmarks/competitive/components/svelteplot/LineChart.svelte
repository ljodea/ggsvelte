<script lang="ts">
  import { Plot, Line, GridX, GridY } from "svelteplot";

  type Row = { x: number; y: number; series: string };
  let { rows, width, height }: { rows: Row[]; width: number; height: number } =
    $props();
</script>

<Plot {width} {height}>
  <GridX />
  <GridY />
  <Line data={rows} x="x" y="y" stroke="series" strokeWidth={1.5} />
</Plot>
