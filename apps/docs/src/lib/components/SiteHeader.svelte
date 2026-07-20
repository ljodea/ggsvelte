<script lang="ts">
  import { base } from "$app/paths";
  import { onMount } from "svelte";

  const { path }: { path: string } = $props();

  let menu = $state<HTMLDialogElement>();
  let appearance = $state<"light" | "dark">("light");

  const links = $derived([
    {
      label: "Docs",
      href: "/guide/getting-started",
      active: path.startsWith("/guide/"),
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
      href: "/reference/interactions",
      active: path.startsWith("/reference"),
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
