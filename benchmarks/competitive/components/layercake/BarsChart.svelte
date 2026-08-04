<script>
  import { LayerCake, Svg } from "layercake";
  import { scaleBand } from "d3-scale";
  import StackedBarsSvg from "./StackedBarsSvg.svelte";

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
    x="category"
    y={["y0", "y1"]}
    xScale={scaleBand().padding(0.1)}
    padding={{ top: 20, right: 20, bottom: 40, left: 50 }}
  >
    <Svg>
      <StackedBarsSvg />
    </Svg>
  </LayerCake>
</div>
