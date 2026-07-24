<script lang="ts">
  /**
   * <ScaleColorBinned> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorBinned(…)`. Emits NO markup.
   */
  import {
    scaleColorBinned,
    type BinnedColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: BinnedColorScaleOptions = $props();
  createScaleLayer(() => scaleColorBinned(definedProps(props)));
</script>
