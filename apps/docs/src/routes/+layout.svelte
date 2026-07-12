<script lang="ts">
  import "../app.css";

  const { children } = $props();
</script>

<svelte:head>
  <title>ggsvelte</title>
</svelte:head>

<!-- .site-chrome is hidden in VR mode (html[data-vr], see app.css) -->
<header class="site-chrome">
  <nav>
    <a class="brand" href="/">ggsvelte</a>
    <a href="/guide/getting-started">Guide</a>
    <a href="/examples">Examples</a>
    <a href="https://github.com/ljodea/ggsvelte" rel="external">GitHub</a>
  </nav>
</header>

<main class="site-main">
  {@render children()}
</main>
