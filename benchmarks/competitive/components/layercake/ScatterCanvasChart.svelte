<script>
  import { LayerCake, Canvas } from "layercake";
  import { scaleOrdinal } from "d3-scale";
  import ScatterCanvas from "./ScatterCanvas.svelte";

  const COLORS = [
    "#4e79a7",
    "#f28e2b",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc948",
    "#b07aa1",
  ];

  let { rows: initialRows, width = 800, height = 500 } = $props();
  // Plain-props mount (zero proxy cost); updates flow through the exported
  // setRows — component exports land on the object returned by svelte's
  // mount(). $state.raw: 30k-row datasets must NOT be deep-proxied.
  let rows = $state.raw(initialRows);
  export function setRows(next) {
    rows = next;
  }
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <LayerCake
    data={rows}
    x="x"
    y="y"
    z="cls"
    zScale={scaleOrdinal()}
    zRange={COLORS}
    padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
  >
    <Canvas>
      <ScatterCanvas />
    </Canvas>
  </LayerCake>
</div>
