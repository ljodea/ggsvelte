<script lang="ts">
  /**
   * <ThemeTest> — declaration-only "test" theme layer for <GGPlot>.
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   * High-contrast snapshot chrome for package tests / VR (#823).
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("test", () => props);
</script>
