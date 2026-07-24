<script lang="ts">
  /**
   * <ScaleColorManual> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorManual(…)`. Emits NO markup.
   */
  import {
    scaleColorManual,
    type ManualColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: ManualColorScaleOptions = $props();
  createScaleLayer(() => scaleColorManual(definedProps(props)));
</script>
