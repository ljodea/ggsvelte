<script lang="ts">
  /**
   * <ThemeTufte> — declaration-only "tufte" theme layer for <GGPlot>.
   * Accepts optional role overrides (`ink`, `paper`, …). Emits NO markup.
   */
  import {
    createNamedThemeLayer,
    type NamedThemeLayerProps,
  } from "./factory.svelte.js";

  const props: NamedThemeLayerProps = $props();
  createNamedThemeLayer("tufte", () => props);
</script>
