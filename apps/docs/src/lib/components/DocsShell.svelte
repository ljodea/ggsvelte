<script lang="ts">
  import type { Snippet } from "svelte";

  import { GUIDE_NAVIGATION } from "$lib/routes";
  import type { DocsRouteMetadata } from "$lib/route-types";

  import Breadcrumbs from "./Breadcrumbs.svelte";
  import DocsSidebar from "./DocsSidebar.svelte";
  import OnThisPage from "./OnThisPage.svelte";
  import PrevNext from "./PrevNext.svelte";

  const {
    route,
    path,
    previous,
    next,
    children,
  }: {
    route: DocsRouteMetadata;
    path: string;
    previous?: DocsRouteMetadata;
    next?: DocsRouteMetadata;
    children: Snippet;
  } = $props();

  let chapterDialog = $state<HTMLDialogElement>();
  const headings = $derived(route.headings ?? []);
  const displayTitle = $derived(
    route.navigation?.label ?? route.title.replace(" — ggsvelte", ""),
  );

  function openChapters(): void {
    chapterDialog?.showModal();
  }

  function closeChapters(): void {
    chapterDialog?.close();
  }

  function closeFromBackdrop(event: MouseEvent): void {
    if (event.target === chapterDialog) closeChapters();
  }
</script>

<a class="skip-link docs-skip" href="#guide-chapters-trigger"
  >Skip to docs navigation</a
>

<div class="docs-mobile-tools site-chrome">
  <button
    id="guide-chapters-trigger"
    type="button"
    aria-label="Open guide chapters"
    onclick={openChapters}>Chapters</button
  >
  {#if headings.length > 0}
    <details>
      <summary>On this page</summary>
      <OnThisPage {headings} />
    </details>
  {/if}
</div>

<div class="docs-layout">
  <aside id="guide-chapters" class="docs-rail" tabindex="-1">
    <DocsSidebar groups={GUIDE_NAVIGATION} {path} />
  </aside>

  <div class="docs-article">
    <Breadcrumbs
      title={displayTitle}
      reference={path.startsWith("/reference/")}
    />
    {@render children()}
    <PrevNext {previous} {next} />
  </div>

  <aside class="contents-rail">
    <OnThisPage {headings} />
  </aside>
</div>

<dialog
  class="chapter-dialog"
  bind:this={chapterDialog}
  onclick={closeFromBackdrop}
>
  <div class="chapter-dialog__panel">
    <div class="chapter-dialog__heading">
      <span>Guide chapters</span>
      <button
        type="button"
        aria-label="Close guide chapters"
        onclick={closeChapters}>Close</button
      >
    </div>
    <DocsSidebar groups={GUIDE_NAVIGATION} {path} onNavigate={closeChapters} />
  </div>
</dialog>
