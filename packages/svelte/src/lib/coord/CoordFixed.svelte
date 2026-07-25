<script lang="ts">
  /**
   * <CoordFixed> — declaration-only fixed-aspect coordinate layer for
   * <GGPlot> (#659 slice 5). Accepts the same options as `coordFixed(…)`.
   * Also exported as `CoordEqual` (alias of `coordEqual = coordFixed`).
   * Emits NO markup.
   */
  import { coordFixed, type CoordFixedOptions } from "@ggsvelte/spec";

  import { createCoordLayer, definedProps } from "./factory.svelte.js";

  const props: CoordFixedOptions = $props();
  createCoordLayer(() => coordFixed(definedProps(props)));
</script>
