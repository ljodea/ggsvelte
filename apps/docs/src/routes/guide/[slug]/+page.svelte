<script lang="ts">
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<!-- Guide markdown is repository-authored catalog content, never user input. -->
<article class="guide prose">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html data.html}
</article>
