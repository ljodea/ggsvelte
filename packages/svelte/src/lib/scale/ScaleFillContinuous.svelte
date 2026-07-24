<script lang="ts">
  /**
   * <ScaleFillContinuous> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillContinuous(…)`. Emits NO markup.
   */
  import {
    scaleFillContinuous,
    type SequentialColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: SequentialColorScaleOptions = $props();
  createScaleLayer(() => scaleFillContinuous(definedProps(props)));
</script>
