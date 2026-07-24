<script lang="ts">
  /**
   * <ScaleFillDate> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillDate(…)`. Emits NO markup.
   */
  import {
    scaleFillDate,
    type TemporalColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TemporalColorScaleOptions = $props();
  createScaleLayer(() => scaleFillDate(definedProps(props)));
</script>
