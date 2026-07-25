<script lang="ts">
  import { base } from "$app/paths";

  import { INTERACTION_EXPOSITION_IDS } from "$lib/catalog/interaction-exposition";
  import InteractionDemo from "$lib/components/InteractionDemo.svelte";
  import { EXAMPLES } from "$lib/examples";

  const demos = INTERACTION_EXPOSITION_IDS.map((id) => {
    const entry = EXAMPLES.find((example) => example.id === id);
    if (entry === undefined) {
      throw new Error(`Missing interaction exposition manifest entry: ${id}`);
    }
    return entry;
  });
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

  <section class="demos" aria-labelledby="interaction-demos-heading">
    <header>
      <p class="eyebrow">Runnable demos</p>
      <h2 id="interaction-demos-heading">Deeper interaction patterns</h2>
    </header>
    <ul>
      {#each demos as demo (demo.id)}
        <li>
          <a href={`${base}/interactions/${demo.name}`}>
            <span class="demo-title">{demo.title}</span>
            <span class="demo-desc">{demo.description}</span>
          </a>
        </li>
      {/each}
    </ul>
  </section>
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

  .demos {
    margin-top: clamp(2.5rem, 6vw, 4rem);
    max-width: 48rem;
  }

  .demos h2 {
    margin: 0.25rem 0 1rem;
    font-size: 1.35rem;
  }

  .demos ul {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .demos a {
    display: grid;
    gap: 0.35rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    color: inherit;
    text-decoration: none;
  }

  .demos a:hover {
    border-color: var(--ink);
  }

  .demo-title {
    font-weight: 650;
  }

  .demo-desc {
    color: var(--muted);
    font-size: 0.92rem;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    overflow: hidden;
  }
</style>
