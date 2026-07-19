<script lang="ts">
  import { base } from "$app/paths";

  import Scatter from "$examples/point/scatter-color/Example.svelte";
</script>

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
  <pre><code>bun add @ggsvelte/svelte</code></pre>
  <p>
    <a href={`${base}/guide/getting-started`}>Get started →</a>
    &nbsp;·&nbsp;
    <a href={`${base}/examples`}>Browse the example gallery →</a>
    &nbsp;·&nbsp;
    <a href={`${base}/examples/interactions/inspection`}
      >Inspect a live plot →</a
    >
    &nbsp;·&nbsp;
    <a href={`${base}/playground`}>Use my data →</a>
  </p>
  <p>
    Agents: <a href={`${base}/schema/v0.json`}>JSON Schema</a> ·
    <a href={`${base}/llms.txt`}>llms.txt</a> ·
    <a href={`${base}/llms-full.txt`}>llms-full.txt</a> ·
    <a href={`${base}/guide/errors`}>error catalog</a>
  </p>
</section>

<section class="next-steps" aria-labelledby="interactive-heading">
  <div>
    <p class="eyebrow">Interactive, only when you ask</p>
    <h2 id="interactive-heading">Start static. Opt into useful behavior.</h2>
    <p>
      Add inspection, a clean HTML tooltip and crosshair, stable selection, or
      brush zoom without changing the chart grammar. Events report data meaning,
      not renderer indices.
    </p>
  </div>
  <nav aria-label="Interactive starting points">
    <a href={`${base}/examples/interactions/inspection`}
      >Try inspection and pinning</a
    >
    <a href={`${base}/examples/interactions/interval-selection`}
      >Try selection and zoom</a
    >
    <a href={`${base}/reference/interactions`}>Search the event reference</a>
  </nav>
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

  .next-steps {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(14rem, 1fr);
    gap: 2rem;
    margin: 2.5rem 0;
    padding: 1.25rem;
    border: 1px solid var(--border);
    border-radius: 0.65rem;
    background: var(--surface);
  }

  .next-steps h2 {
    margin: 0.15rem 0 0.45rem;
  }

  .next-steps p:last-child {
    margin-bottom: 0;
  }

  .next-steps nav {
    display: grid;
    align-content: center;
    gap: 0.7rem;
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  @media (max-width: 42rem) {
    .next-steps {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
  }
</style>
