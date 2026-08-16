<script lang="ts">
  import { Chart } from "@tanstack/charts/svelte";

  import { defineArea } from "../../adapters/tanstack-defs";

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
  const definition = $derived(defineArea(rows));
</script>

<Chart {definition} {width} {height} ariaLabel="tanstack area" />
