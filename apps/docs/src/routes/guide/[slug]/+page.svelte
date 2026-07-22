<script lang="ts">
  import GettingStartedGuide from "$lib/components/GettingStartedGuide.svelte";
  import { attachGuideCodeCopy } from "$lib/guide-code-copy";
  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

{#if data.page.slug === "getting-started"}
  <GettingStartedGuide />
{:else}
  <!-- Guide markdown is repository-authored catalog content, never user input. -->
  <article class="guide prose" {@attach attachGuideCodeCopy}>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
    {@html data.html}
  </article>
{/if}
