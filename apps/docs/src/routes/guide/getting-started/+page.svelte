<script lang="ts">
  /**
   * Dedicated route so pure markdown guide chapters under `guide/[slug]` do not
   * share a client module with the lesson chart / copy-heavy getting-started
   * graph. URL stays `/guide/getting-started` (static segment wins over [slug]).
   */
  import GettingStartedGuide from "$lib/components/GettingStartedGuide.svelte";
</script>

<GettingStartedGuide />
