<script lang="ts">
  /**
   * <ThemeGray> — declaration-only "gray" theme layer for <GGPlot>
   * (US spelling; alias of the ggplot2 grey-panel look). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("gray", () => props);
</script>
