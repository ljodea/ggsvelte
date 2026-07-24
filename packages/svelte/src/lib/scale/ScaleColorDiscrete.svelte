<script lang="ts">
  /**
   * <ScaleColorDiscrete> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorDiscrete(…)`. Emits NO markup.
   */
  import {
    scaleColorDiscrete,
    type DiscreteColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: DiscreteColorScaleOptions = $props();
  createScaleLayer(() => scaleColorDiscrete(definedProps(props)));
</script>
