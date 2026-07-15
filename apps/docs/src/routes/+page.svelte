<script lang="ts">
  import { base } from "$app/paths";

  import Scatter from "$examples/point/scatter-color/Example.svelte";
</script>

<svelte:head>
  <title>ggsvelte — layered grammar of graphics for Svelte</title>
</svelte:head>

<section class="hero">
  <h1>ggsvelte</h1>
  <p class="tagline">
    A layered grammar of graphics for JavaScript: ggplot2 semantics, a
    JSON-serializable spec, Svelte 5 components, and value-stable color scales —
    remove a series and nothing else changes color.
  </p>
  <p>
    One spec, three surfaces: agents emit JSON, developers chain the builder or
    compose Svelte components — all three compile to the same canonical
    <code>PortableSpec</code>.
  </p>
  <pre><code>bun add ggsvelte</code></pre>
  <p>
    <a href={`${base}/guide/getting-started`}>Get started →</a>
    &nbsp;·&nbsp;
    <a href={`${base}/examples`}>Browse the example gallery →</a>
    &nbsp;·&nbsp;
    <a href={`${base}/guide/interactions`}>Add interaction →</a>
  </p>
  <p>
    Agents: <a href={`${base}/schema/v0.json`}>JSON Schema</a> ·
    <a href={`${base}/llms.txt`}>llms.txt</a> ·
    <a href={`${base}/llms-full.txt`}>llms-full.txt</a> ·
    <a href={`${base}/guide/errors`}>error catalog</a>
  </p>
</section>

<section class="demo">
  <Scatter />
</section>

<style>
  .hero {
    margin: 2rem 0;
  }

  .tagline {
    font-size: 1.15rem;
    max-width: 44rem;
  }

  .demo {
    margin: 2rem 0;
  }
</style>
