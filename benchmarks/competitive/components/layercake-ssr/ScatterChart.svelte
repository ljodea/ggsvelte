<script>
  // SSR twin of components/layercake/ScatterChart.svelte: LayerCake only
  // renders server-side when its documented `ssr` prop is set (and explicit
  // width/height stand in for the client-size bindings it measures in the
  // browser). Row shape matches the browser adapter exactly.
  import { LayerCake, Svg } from "layercake";
  import { scaleOrdinal } from "d3-scale";
  import ScatterSvg from "../layercake/ScatterSvg.svelte";

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
    ssr={true}
    {width}
    {height}
    data={rows}
    x="x"
    y="y"
    z="cls"
    zScale={scaleOrdinal()}
    zRange={COLORS}
    padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
  >
    <Svg>
      <ScatterSvg />
    </Svg>
  </LayerCake>
</div>
