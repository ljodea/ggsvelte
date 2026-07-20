<script lang="ts">
  import "../app.css";

  import DocsShell from "$lib/components/DocsShell.svelte";
  import SiteFooter from "$lib/components/SiteFooter.svelte";
  import SiteHeader from "$lib/components/SiteHeader.svelte";

  import type { LayoutProps } from "./$types";

  const { data, children }: LayoutProps = $props();
  const noindex = $derived(
    !data.site.indexable || data.route === undefined || !data.route.index,
  );
</script>

<svelte:head>
  <title>{data.route?.title ?? "ggsvelte"}</title>
  {#if data.route !== undefined}
    <meta name="description" content={data.route.description} />
  {/if}
  {#if data.canonical !== undefined}
    <link rel="canonical" href={data.canonical} />
  {/if}
  {#if noindex}
    <meta name="robots" content="noindex,follow" />
  {/if}
</svelte:head>

<a class="skip-link" href="#main-content">Skip to content</a>
<SiteHeader path={data.path} route={data.route} />

<main
  id="main-content"
  class:docs-main={data.route?.shell === "docs"}
  class="site-main"
  data-build-mode={data.site.mode}
>
  {#if data.route?.shell === "docs"}
    <DocsShell
      route={data.route}
      path={data.path}
      previous={data.sequence.previous}
      next={data.sequence.next}
    >
      {@render children()}
    </DocsShell>
  {:else}
    {@render children()}
  {/if}
</main>

<SiteFooter />
