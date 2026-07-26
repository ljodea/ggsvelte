<script lang="ts">
  /**
   * <GuideLegend> — declaration-only legend-guide layer for <GGPlot>
   * (#659 slice 6). Presentation of one aesthetic's legend: title, position,
   * direction, key size, collision, and the INTEGER placement rank `order`.
   *
   * Not to be confused with <Legend order="sorted"/>, which is the plot-wide
   * entry-SORT enum (LegendSpec). Same word, unrelated concepts.
   * Emits NO markup.
   */
  import { guideLegend, type LegendGuideOptions } from "@ggsvelte/spec";

  import { createPlotLayer } from "../layers/plot-layer.svelte.js";
  import {
    splitChannel,
    type NonPositionGuideChannel,
  } from "./factory.svelte.js";

  type Props = LegendGuideOptions & { channel: NonPositionGuideChannel };

  const props: Props = $props();
  createPlotLayer("guides", () => {
    const { channel, options } = splitChannel(props);
    return { [channel]: guideLegend(options) };
  });
</script>
