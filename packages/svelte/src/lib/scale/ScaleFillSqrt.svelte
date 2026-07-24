<script lang="ts">
  /**
   * <ScaleFillSqrt> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillSqrt(…)`. Emits NO markup.
   */
  import {
    scaleFillSqrt,
    type TransformedColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TransformedColorScaleOptions = $props();
  createScaleLayer(() => scaleFillSqrt(definedProps(props)));
</script>
