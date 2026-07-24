<script lang="ts">
  /**
   * <ThemeGgplot2> — declaration-only "ggplot2" theme layer for <GGPlot>.
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("ggplot2", () => props);
</script>
