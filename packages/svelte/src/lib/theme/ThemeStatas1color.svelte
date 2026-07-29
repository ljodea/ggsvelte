<script lang="ts">
  /**
   * <ThemeStatas1color> — declaration-only "stata_s1color" theme layer for <GGPlot>.
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("stata_s1color", () => props);
</script>
