<script lang="ts">
  import { base } from "$app/paths";

  type Crumb = {
    label: string;
    /** Omit href (or leave undefined) for the current page. */
    href?: string;
  };

  const { crumbs }: { crumbs: readonly Crumb[] } = $props();
</script>

<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    {#each crumbs as crumb, index (crumb.label + String(index))}
      <li aria-current={index === crumbs.length - 1 ? "page" : undefined}>
        {#if crumb.href !== undefined && index < crumbs.length - 1}
          <a href={`${base}${crumb.href}`}>{crumb.label}</a>
        {:else}
          {crumb.label}
        {/if}
      </li>
    {/each}
  </ol>
</nav>
