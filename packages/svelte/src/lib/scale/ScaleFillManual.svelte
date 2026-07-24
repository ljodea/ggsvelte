<script lang="ts">
  /**
   * <ScaleFillManual> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillManual(…)`. Emits NO markup.
   */
  import {
    scaleFillManual,
    type ManualColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: ManualColorScaleOptions = $props();
  createScaleLayer(() => scaleFillManual(definedProps(props)));
</script>
