<script lang="ts">
  /**
   * <ScaleFillIdentity> — declaration-only fill-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleFillIdentity(…)`. Emits NO markup.
   */
  import {
    scaleFillIdentity,
    type IdentityColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: IdentityColorScaleOptions = $props();
  createScaleLayer(() => scaleFillIdentity(definedProps(props)));
</script>
