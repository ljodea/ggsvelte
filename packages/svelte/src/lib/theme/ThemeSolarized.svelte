<script lang="ts">
  /**
   * <ThemeSolarized> — declaration-only "solarized" theme layer for <GGPlot>.
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("solarized", () => props);
</script>
