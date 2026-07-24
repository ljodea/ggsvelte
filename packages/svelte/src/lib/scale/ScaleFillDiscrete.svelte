<script lang="ts">
  /**
   * <ScaleFillDiscrete> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillDiscrete(…)`. Emits NO markup.
   */
  import {
    scaleFillDiscrete,
    type DiscreteColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: DiscreteColorScaleOptions = $props();
  createScaleLayer(() => scaleFillDiscrete(definedProps(props)));
</script>
