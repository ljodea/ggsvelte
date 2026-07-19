<script lang="ts">
  import { base } from "$app/paths";

  import type { DocsRouteMetadata } from "$lib/route-types";

  const {
    previous,
    next,
  }: { previous?: DocsRouteMetadata; next?: DocsRouteMetadata } = $props();
</script>

{#if previous !== undefined || next !== undefined}
  <nav class="prev-next" aria-label="Previous and next chapters">
    {#if previous !== undefined}
      <a class="previous" href={`${base}${previous.path}`}>
        <span>Previous</span>
        <strong>{previous.navigation?.label ?? previous.title}</strong>
      </a>
    {:else}<span></span>{/if}
    {#if next !== undefined}
      <a class="next" href={`${base}${next.path}`}>
        <span>Next</span>
        <strong>{next.navigation?.label ?? next.title}</strong>
      </a>
    {/if}
  </nav>
{/if}
