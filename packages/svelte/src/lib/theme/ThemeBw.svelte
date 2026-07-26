<script lang="ts">
  /**
   * <ThemeBw> — declaration-only "bw" theme layer for <GGPlot>.
   * White panel, grey grid, rectangular border (ggplot2 theme_bw).
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("bw", () => props);
</script>
