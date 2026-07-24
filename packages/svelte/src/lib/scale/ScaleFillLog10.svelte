<script lang="ts">
  /**
   * <ScaleFillLog10> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillLog10(…)`. Emits NO markup.
   */
  import {
    scaleFillLog10,
    type TransformedColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TransformedColorScaleOptions = $props();
  createScaleLayer(() => scaleFillLog10(definedProps(props)));
</script>
