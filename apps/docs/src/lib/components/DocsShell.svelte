<script lang="ts">
  import type { Snippet } from "svelte";

  import { GUIDE_NAVIGATION, primaryNavigationOwner } from "$lib/routes";
  import type { DocsRouteMetadata } from "$lib/route-types";

  import Breadcrumbs from "./Breadcrumbs.svelte";
  import DocsSidebar from "./DocsSidebar.svelte";
  import OnThisPage from "./OnThisPage.svelte";
  import PrevNext from "./PrevNext.svelte";

  type Crumb = { label: string; href?: string };

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
  const reference = $derived(primaryNavigationOwner(route) === "reference");
  const crumbs = $derived(buildCrumbs(path, displayTitle, reference));

  function buildCrumbs(
    currentPath: string,
    title: string,
    isReference: boolean,
  ): readonly Crumb[] {
    const root: Crumb = {
      label: isReference ? "Reference" : "Docs",
      href: isReference ? "/reference" : "/docs",
    };

    if (!isReference) {
      return [root, { label: title }];
    }

    // /reference → just "Reference"
    if (currentPath === "/reference" || currentPath === "/reference/") {
      return [{ label: "Reference" }];
    }

    const segments = currentPath.replaceAll(/^\/+|\/+$/g, "").split("/");
    // ["reference", "geoms"] or ["reference", "geoms", "col"]
    if (segments[0] !== "reference" || segments.length < 2) {
      return [root, { label: title }];
    }

    const section = segments[1] ?? "";
    const sectionLabel = referenceSectionLabel(section);
    if (sectionLabel === undefined) {
      return [root, { label: title }];
    }

    const sectionHref = `/reference/${section}`;
    if (segments.length === 2) {
      return [root, { label: sectionLabel }];
    }

    // Detail page: Reference / Geoms / GeomCol (title already component name)
    return [root, { label: sectionLabel, href: sectionHref }, { label: title }];
  }

  function referenceSectionLabel(section: string): string | undefined {
    switch (section) {
      case "geoms":
        return "Geoms";
      case "stats":
        return "Stats";
      case "positions":
        return "Positions";
      case "interactions":
        return "Interactions";
      case "cli":
        return "CLI";
      default:
        return undefined;
    }
  }

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
    aria-label="Open docs navigation"
    onclick={openChapters}>Menu</button
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
    <Breadcrumbs {crumbs} />
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
      <span>Docs</span>
      <button
        type="button"
        aria-label="Close docs navigation"
        onclick={closeChapters}>Close</button
      >
    </div>
    <DocsSidebar groups={GUIDE_NAVIGATION} {path} onNavigate={closeChapters} />
  </div>
</dialog>
