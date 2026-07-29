<script lang="ts">
  import { base } from "$app/paths";
  import { onMount } from "svelte";

  import {
    readDocsAppearance,
    toggleDocsAppearance,
    writeDocsAppearance,
    type DocsAppearance,
  } from "$lib/docs-appearance";
  import { primaryNavLinks } from "$lib/primary-nav-links";
  import { primaryNavigationOwner } from "$lib/routes-nav";
  import type { DocsRouteMetadata } from "$lib/route-types";
  import type { Component } from "svelte";

  type SiteSearchApi = { open: (trigger: HTMLElement) => void };

  const { path, route }: { path: string; route?: DocsRouteMetadata } = $props();
  const owner = $derived(primaryNavigationOwner(route));

  let menu = $state<HTMLDialogElement>();
  let search = $state<SiteSearchApi | undefined>();
  // Dynamic component; bind:this is narrowed via $effect after mount.
  let SiteSearch = $state<Component | null>(null);
  /** Open target while SiteSearch is mounting (first open only). */
  let pendingSearchTrigger = $state<HTMLElement | null>(null);
  let appearance = $state<DocsAppearance>("light");

  const links = $derived(primaryNavLinks(path, owner));

  function syncAppearance(): void {
    appearance = readDocsAppearance();
  }

  function toggleAppearance(): void {
    syncAppearance();
    appearance = toggleDocsAppearance(appearance);
    writeDocsAppearance(appearance);
  }

  function openMenu(): void {
    menu?.showModal();
  }

  /**
   * Search UI + index stay off the first-paint graph. Mount the dialog on the
   * first open, then call open() once bind:this is set.
   */
  async function openSearch(event: MouseEvent): Promise<void> {
    if (!(event.currentTarget instanceof HTMLElement)) return;
    const trigger = event.currentTarget;
    if (search !== undefined) {
      search.open(trigger);
      return;
    }
    pendingSearchTrigger = trigger;
    if (SiteSearch === null) {
      const mod = await import("./SiteSearch.svelte");
      SiteSearch = mod.default;
    }
  }

  $effect(() => {
    const api = search;
    const trigger = pendingSearchTrigger;
    if (api === undefined || trigger === null) return;
    pendingSearchTrigger = null;
    api.open(trigger);
  });

  function closeMenu(): void {
    menu?.close();
  }

  function closeFromBackdrop(event: MouseEvent): void {
    if (event.target === menu) closeMenu();
  }

  onMount(syncAppearance);
</script>

<header class="site-header site-chrome">
  <div class="site-header__inner">
    <a class="site-brand" href={`${base}/`} aria-label="ggsvelte home"
      >ggsvelte</a
    >

    <nav class="desktop-nav" aria-label="Primary">
      {#each links as link (link.href)}
        <a
          href={`${base}${link.href}`}
          aria-current={link.active ? "page" : undefined}>{link.label}</a
        >
      {/each}
    </nav>

    <div class="site-actions desktop-actions">
      <button type="button" class="search-trigger" onclick={openSearch}>
        Search <span class="visually-hidden">documentation</span>
      </button>
      <button type="button" class="appearance" onclick={toggleAppearance}>
        {appearance === "dark" ? "Light" : "Dark"}
        <span class="visually-hidden">appearance</span>
      </button>
      <a
        class="github-link"
        href="https://github.com/ljodea/ggsvelte"
        rel="external">GitHub <span aria-hidden="true">↗</span></a
      >
    </div>

    <button
      type="button"
      class="mobile-search-trigger"
      aria-label="Search documentation"
      onclick={openSearch}>Search</button
    >

    <button
      type="button"
      class="menu-trigger"
      aria-label="Open site menu"
      onclick={openMenu}
    >
      <span aria-hidden="true"></span><span aria-hidden="true"></span><span
        aria-hidden="true"
      ></span>
    </button>
  </div>
</header>

<dialog class="site-menu" bind:this={menu} onclick={closeFromBackdrop}>
  <div class="site-menu__panel">
    <div class="site-menu__heading">
      <span>Navigate</span>
      <button type="button" aria-label="Close site menu" onclick={closeMenu}
        >Close</button
      >
    </div>
    <nav aria-label="Primary">
      {#each links as link (link.href)}
        <a
          href={`${base}${link.href}`}
          aria-current={link.active ? "page" : undefined}
          onclick={closeMenu}>{link.label}</a
        >
      {/each}
      <a
        href="https://github.com/ljodea/ggsvelte"
        rel="external"
        onclick={closeMenu}>GitHub ↗</a
      >
    </nav>
    <button
      type="button"
      class="appearance mobile-appearance"
      onclick={toggleAppearance}
    >
      Use {appearance === "dark" ? "light" : "dark"} appearance
    </button>
  </div>
</dialog>

{#if SiteSearch}
  <SiteSearch
    bind:this={
      () => search,
      (value) => {
        search = value as unknown as SiteSearchApi | undefined;
      }
    }
  />
{/if}
