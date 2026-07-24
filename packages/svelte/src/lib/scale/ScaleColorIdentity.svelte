<script lang="ts">
  /**
   * <ScaleColorIdentity> — declaration-only color-scale layer for <GGPlot>
   * (#659 slice 3). Accepts the same options as `scaleColorIdentity(…)`. Emits NO markup.
   */
  import {
    scaleColorIdentity,
    type IdentityColorScaleOptions,
  } from "@ggsvelte/spec";

  import { createScaleLayer, definedProps } from "./factory.svelte.js";

  const props: IdentityColorScaleOptions = $props();
  createScaleLayer(() => scaleColorIdentity(definedProps(props)));
</script>
