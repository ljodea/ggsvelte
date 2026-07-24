<script lang="ts">
  /**
   * <ScaleColorContinuous> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorContinuous(…)`. Emits NO markup.
   */
  import {
    scaleColorContinuous,
    type SequentialColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: SequentialColorScaleOptions = $props();
  createScaleLayer(() => scaleColorContinuous(definedProps(props)));
</script>
