<script lang="ts">
  /**
   * <ScaleColorDatetime> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorDatetime(…)`. Emits NO markup.
   */
  import {
    scaleColorDatetime,
    type TemporalColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: TemporalColorScaleOptions = $props();
  createScaleLayer(() => scaleColorDatetime(definedProps(props)));
</script>
