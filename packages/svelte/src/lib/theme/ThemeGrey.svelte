<script lang="ts">
  /**
   * <ThemeGrey> — declaration-only "grey" theme layer for <GGPlot>
   * (UK spelling; alias of the ggplot2 grey-panel look). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("grey", () => props);
</script>
