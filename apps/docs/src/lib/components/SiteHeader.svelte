<script lang="ts">
  import { base } from "$app/paths";
  import { onMount } from "svelte";

  import { primaryNavigationOwner } from "$lib/routes";
  import type { DocsRouteMetadata } from "$lib/route-types";

  import SiteSearch from "./SiteSearch.svelte";

  const { path, route }: { path: string; route?: DocsRouteMetadata } = $props();
  const owner = $derived(primaryNavigationOwner(route));

  let menu = $state<HTMLDialogElement>();
  let search = $state<{ open: (trigger: HTMLElement) => void }>();
  let appearance = $state<"light" | "dark">("light");

  const links = $derived([
    {
      label: "Docs",
      href: "/docs",
      active: owner === "docs",
    },
    {
      label: "Gallery",
      href: "/examples",
      active: path.startsWith("/examples"),
    },
    {
      label: "Playground",
      href: "/playground",
      active: path === "/playground",
    },
    {
      label: "Themes",
      href: "/themes",
      active: path === "/themes",
    },
    {
      label: "Reference",
      href: "/reference",
      active: owner === "reference",
    },
  ]);

  function syncAppearance(): void {
    appearance =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function toggleAppearance(): void {
    syncAppearance();
    appearance = appearance === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = appearance;
    try {
      localStorage.setItem("ggsvelte-theme", appearance);
    } catch {
      // The in-page control still works when storage is unavailable.
    }
  }

  function openMenu(): void {
    menu?.showModal();
  }

  function openSearch(event: MouseEvent): void {
    if (event.currentTarget instanceof HTMLElement)
      search?.open(event.currentTarget);
  }

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

<SiteSearch bind:this={search} />
