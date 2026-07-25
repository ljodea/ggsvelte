<script lang="ts">
  /**
   * <CoordTransform> — declaration-only post-stat coordinate transform for
   * <GGPlot> (#659 slice 5). Accepts the same options as `coordTransform(…)`.
   * Emits NO markup.
   */
  import { coordTransform, type CoordTransformOptions } from "@ggsvelte/spec";

  import { createCoordLayer, definedProps } from "./factory.svelte.js";

  const props: CoordTransformOptions = $props();
  createCoordLayer(() => coordTransform(definedProps(props)));
</script>
