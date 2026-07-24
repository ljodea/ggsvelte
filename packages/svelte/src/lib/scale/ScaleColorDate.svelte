<script lang="ts">
  /**
   * <ScaleColorDate> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorDate(…)`. Emits NO markup.
   */
  import {
    scaleColorDate,
    type TemporalColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TemporalColorScaleOptions = $props();
  createScaleLayer(() => scaleColorDate(definedProps(props)));
</script>
