<script lang="ts">
  /**
   * Gallery-shaped legend-filter fixture: multi-series line+point with
   * GuideLegend filter, matching examples/interaction/legend-filter.
   */
  import {
    GeomLine,
    GeomPoint,
    GGPlot,
    GuideLegend,
    Inspect,
    type LegendFilterEvent,
  } from "../../src/lib/index.js";

  const rows = [
    { id: "d1", year: 1770, series: "National debt", value: 14 },
    { id: "d2", year: 1800, series: "National debt", value: 42 },
    { id: "d3", year: 1820, series: "National debt", value: 75 },
    { id: "r1", year: 1770, series: "Revenue", value: 8 },
    { id: "r2", year: 1800, series: "Revenue", value: 38 },
    { id: "r3", year: 1820, series: "Revenue", value: 54 },
    { id: "e1", year: 1770, series: "Expenditure", value: 9 },
    { id: "e2", year: 1800, series: "Expenditure", value: 58 },
    { id: "e3", year: 1820, series: "Expenditure", value: 69 },
  ];

  let events = $state<LegendFilterEvent[]>([]);
</script>

<div data-legend-filter-multi data-events={JSON.stringify(events)}>
  <GGPlot
    data={rows}
    aes={{ x: "year", y: "value", color: "series" }}
    width={640}
    height={360}
    onlegendfilter={(event) => (events = [...events, event])}
  >
    <Inspect mode="x" pin />
    <GuideLegend channel="color" filter />
    <GeomLine linewidth={2} />
    <GeomPoint size={3} />
  </GGPlot>
</div>
