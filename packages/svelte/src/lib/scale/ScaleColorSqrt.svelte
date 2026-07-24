<script lang="ts">
  /**
   * <ScaleColorSqrt> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorSqrt(…)`. Emits NO markup.
   */
  import {
    scaleColorSqrt,
    type TransformedColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TransformedColorScaleOptions = $props();
  createScaleLayer(() => scaleColorSqrt(definedProps(props)));
</script>
