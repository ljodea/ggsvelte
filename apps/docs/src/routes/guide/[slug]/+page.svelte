<script lang="ts">
  /**
   * Markdown guide chapters only. Getting started lives at
   * `guide/getting-started/` so this client module stays free of the lesson
   * chart dependency graph.
   */
  import { attachGuideCodeCopy } from "$lib/guide-code-copy";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<!-- Guide markdown is repository-authored catalog content, never user input. -->
<article class="guide prose" {@attach attachGuideCodeCopy}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html data.html}
</article>
