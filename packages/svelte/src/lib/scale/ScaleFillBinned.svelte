<script lang="ts">
  /**
   * <ScaleFillBinned> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillBinned(…)`. Emits NO markup.
   */
  import {
    scaleFillBinned,
    type BinnedColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: BinnedColorScaleOptions = $props();
  createScaleLayer(() => scaleFillBinned(definedProps(props)));
</script>
