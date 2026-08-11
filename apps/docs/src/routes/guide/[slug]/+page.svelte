<script lang="ts">
  /** Markdown guide chapters from the shared catalog (same prose as /llms surfaces). */
  import { attachGuideCodeCopy } from "$lib/guide-code-copy";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<!-- Guide markdown is repository-authored catalog content, never user input. -->
<article class="guide prose" {@attach attachGuideCodeCopy}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html data.html}
</article>
