<script lang="ts">
  import type { RouteHeading } from "$lib/route-types";

  const { headings }: { headings: readonly RouteHeading[] } = $props();
</script>

{#if headings.length > 0}
  <nav class="on-this-page" aria-label="On this page">
    <h2>On this page</h2>
    <ol>
      {#each headings as heading (heading.id)}
        <li class:subsection={heading.level === 3}>
          <a href={`#${heading.id}`}>{heading.title}</a>
        </li>
      {/each}
    </ol>
  </nav>
{/if}
