<script lang="ts">
  /**
   * <ScaleColorLog10> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorLog10(…)`. Emits NO markup.
   */
  import {
    scaleColorLog10,
    type TransformedColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TransformedColorScaleOptions = $props();
  createScaleLayer(() => scaleColorLog10(definedProps(props)));
</script>
