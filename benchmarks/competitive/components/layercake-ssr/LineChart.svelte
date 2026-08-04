<script>
  // SSR twin of components/layercake/LineChart.svelte (see ScatterChart note).
  import { LayerCake, Svg } from "layercake";
  import MultiLineSvg from "../layercake/MultiLineSvg.svelte";

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
    padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
  >
    <Svg>
      <MultiLineSvg />
    </Svg>
  </LayerCake>
</div>
