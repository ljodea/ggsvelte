<script lang="ts">
  import { Plot, Dot, GridX, GridY } from "svelteplot";

  type Row = { x: number; y: number; cls: string };
  let { rows, width, height }: { rows: Row[]; width: number; height: number } =
    $props();
</script>

<Plot {width} {height}>
  <GridX />
  <GridY />
  <Dot data={rows} x="x" y="y" fill="cls" r={1.5} fillOpacity={0.7} />
</Plot>
