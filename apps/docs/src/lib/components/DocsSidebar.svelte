<script lang="ts">
  import { base } from "$app/paths";

  import { guideNavBlocks, guideSectionDomId } from "$lib/catalog/guide";
  import type { GuideNavigationGroup } from "$lib/route-types";

  const {
    groups,
    path,
    label = "Guide chapters",
    onNavigate,
  }: {
    groups: readonly GuideNavigationGroup[];
    path: string;
    label?: string;
    onNavigate?: () => void;
  } = $props();

  const blocks = $derived(guideNavBlocks(groups));
</script>

<nav class="docs-sidebar" aria-label={label}>
  {#each blocks as block (block.kind === "section" ? block.section : block.key)}
    {#if block.kind === "section"}
      <section aria-labelledby={guideSectionDomId(block.section)}>
        <h2 id={guideSectionDomId(block.section)}>{block.section}</h2>
        <ul>
          {#each block.entries as entry (entry.path)}
            <li>
              <a
                href={`${base}${entry.path}`}
                aria-current={entry.path === path ? "page" : undefined}
                onclick={onNavigate}>{entry.label}</a
              >
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <ul>
        {#each block.entries as entry (entry.path)}
          <li>
            <a
              href={`${base}${entry.path}`}
              aria-current={entry.path === path ? "page" : undefined}
              onclick={onNavigate}>{entry.label}</a
            >
          </li>
        {/each}
      </ul>
    {/if}
  {/each}
</nav>
