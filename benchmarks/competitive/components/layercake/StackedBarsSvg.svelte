<script>
  import { getContext } from "svelte";

  const { data, xScale, yScale } = getContext("LayerCake");

  // Rows are long-form with stacked offsets precomputed by the adapter via
  // d3-shape stack(): { category, y0, y1, stack, color }. x is a band scale
  // (passed as xScale on <LayerCake>); y domain covers the stacked totals
  // because the y accessor spans [y0, y1].
</script>

{#each $data as d}
  <rect
    x={$xScale(d.category)}
    y={$yScale(d.y1)}
    width={$xScale.bandwidth()}
    height={Math.max(0, $yScale(d.y0) - $yScale(d.y1))}
    fill={d.color}
  />
{/each}
