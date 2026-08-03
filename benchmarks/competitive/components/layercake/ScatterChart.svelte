<script>
  import { LayerCake, Svg } from "layercake";
  import { scaleOrdinal } from "d3-scale";
  import ScatterSvg from "./ScatterSvg.svelte";

  const COLORS = [
    "#4e79a7",
    "#f28e2b",
    "#e15759",
    "#76b7b2",
    "#59a14f",
    "#edc948",
    "#b07aa1",
  ];

  let { rows, width = 800, height = 500 } = $props();
</script>

<div style="width:{width}px; height:{height}px; position:relative;">
  <LayerCake
    data={rows}
    x="x"
    y="y"
    z="cls"
    zScale={scaleOrdinal().range(COLORS)}
    padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
  >
    <Svg>
      <ScatterSvg />
    </Svg>
  </LayerCake>
</div>
