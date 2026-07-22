<script lang="ts">
  import { base } from "$app/paths";

  import InteractionDemo from "$lib/components/InteractionDemo.svelte";
</script>

<main class="interactions-page">
  <header class="intro">
    <p class="eyebrow">Interactions</p>
    <h1>Chart-local interaction</h1>
    <p>
      Inspect, select, zoom, and legend focus on one plot. Shared semantic state
      is opt-in via <code>createPlotInteraction</code>. Full prop and event
      contracts are in the
      <a href={`${base}/reference/interactions`}>interaction reference</a>
      and
      <a href={`${base}/guide/interactions`}>interactions guide</a>.
    </p>
  </header>

  <InteractionDemo />
</main>

<style>
  .interactions-page {
    min-width: 0;
    max-width: 100%;
    padding-bottom: clamp(3rem, 7vw, 6rem);
  }

  .intro {
    max-width: 42rem;
    padding: clamp(2rem, 5vw, 3.5rem) 0 1.75rem;
  }

  .intro h1 {
    margin: 0.25rem 0 0.75rem;
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
  }

  .intro > p {
    margin: 0;
    color: var(--muted);
    font-size: 1.02rem;
  }

  .intro a {
    color: inherit;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.15em;
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
</style>
