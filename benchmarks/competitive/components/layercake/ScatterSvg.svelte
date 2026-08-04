<script>
  import { getContext } from "svelte";

  const { data, xGet, yGet, zGet } = getContext("LayerCake");
</script>

{#each $data as d}
  <circle
    cx={$xGet(d)}
    cy={$yGet(d)}
    r={1.5}
    fill={$zGet(d)}
    fill-opacity={0.7}
  />
{/each}
