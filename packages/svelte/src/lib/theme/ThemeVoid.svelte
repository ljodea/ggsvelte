<script lang="ts">
  /**
   * <ThemeVoid> — declaration-only "void" theme layer for <GGPlot>.
   * Suppresses axes, grid, and panel chrome (ggplot2 theme_void).
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("void", () => props);
</script>
