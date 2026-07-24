<script lang="ts">
  /**
   * <ScaleFillDatetime> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillDatetime(…)`. Emits NO markup.
   */
  import {
    scaleFillDatetime,
    type TemporalColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TemporalColorScaleOptions = $props();
  createScaleLayer(() => scaleFillDatetime(definedProps(props)));
</script>
