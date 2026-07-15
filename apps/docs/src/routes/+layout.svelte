<script lang="ts">
  import { base } from "$app/paths";

  import "../app.css";

  const { children } = $props();
</script>

<svelte:head>
  <title>ggsvelte</title>
</svelte:head>

<!-- .site-chrome is hidden in VR mode (html[data-vr], see app.css) -->
<header class="site-chrome">
  <nav>
    <a class="brand" href={`${base}/`}>ggsvelte</a>
    <a href={`${base}/guide/getting-started`}>Guide</a>
    <a href={`${base}/examples`}>Examples</a>
    <a href={`${base}/playground`}>Playground</a>
    <a href="https://github.com/ljodea/ggsvelte" rel="external">GitHub</a>
  </nav>
</header>

<main class="site-main">
  {@render children()}
</main>
