<script lang="ts">
  /**
   * <ThemeSolarized2dark> — declaration-only "solarized_2dark" theme layer for <GGPlot>.
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("solarized_2dark", () => props);
</script>
