<script lang="ts">
  import { base } from "$app/paths";

  import { renderMarkdown } from "$scripts/gen-llms";

  const { data } = $props();
  const html = $derived(renderMarkdown(data.page.markdown, base));
</script>

<svelte:head>
  <title>{data.page.title} — ggsvelte</title>
  <meta name="description" content={data.page.description} />
</svelte:head>

<!-- Guide markdown is repo-authored content (catalog-driven), never user input. -->
<article class="guide">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</article>

<style>
  .guide {
    max-width: 46rem;
    margin: 2rem 0;
  }

  .guide :global(h1) {
    margin-bottom: 0.5rem;
  }

  .guide :global(h2) {
    margin-top: 2.5rem;
    border-bottom: 1px solid color-mix(in srgb, currentColor 15%, transparent);
    padding-bottom: 0.3rem;
  }

  .guide :global(h3) {
    margin-top: 1.5rem;
  }

  .guide :global(pre) {
    overflow-x: auto;
    padding: 0.9rem 1rem;
    border-radius: 6px;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  .guide :global(code) {
    font-size: 0.92em;
  }

  .guide :global(p code),
  .guide :global(li code),
  .guide :global(h3 code) {
    background: color-mix(in srgb, currentColor 8%, transparent);
    padding: 0.1em 0.3em;
    border-radius: 4px;
  }
</style>
