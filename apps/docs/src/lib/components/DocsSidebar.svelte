<script lang="ts">
  import { base } from "$app/paths";

  import { guideSectionDomId } from "$lib/catalog/guide";
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
</script>

<nav class="docs-sidebar" aria-label={label}>
  {#each groups as group (group.section)}
    <section aria-labelledby={guideSectionDomId(group.section)}>
      <h2 id={guideSectionDomId(group.section)}>{group.section}</h2>
      <ul>
        {#each group.entries as entry (entry.path)}
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
  {/each}
</nav>
