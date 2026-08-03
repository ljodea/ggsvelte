<script lang="ts">
  import { base } from "$app/paths";

  import RampsIndex from "$lib/components/RampsIndex.svelte";
  import SequentialColorLab from "$lib/components/SequentialColorLab.svelte";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<main class="ramps-page">
  <header class="ramps-intro">
    <p class="eyebrow">Palettes</p>
    <h1>Sequential color ramps</h1>
    <p>
      Sequential ramps encode continuous fill. Categorical schemes color
      discrete series — see <a href={`${base}/palettes`}>Color palettes</a>.
    </p>
    <p class="guide-link">
      Scheme names as scale inputs:
      <a href={`${base}/reference/palettes`}>Palettes reference</a>. How to set
      a ramp on a plot:
      <a href={`${base}/reference/scales/color_continuous`}
        >ScaleColorContinuous</a
      >. Narrative guide:
      <a href={`${base}/guide/scales-guides`}>Scales and guides</a>.
    </p>
  </header>

  <section class="ramp-index" aria-label="Sequential scheme index">
    <RampsIndex />
  </section>

  <SequentialColorLab examples={data.sequentialExamples} />
</main>

<style>
  .ramps-page {
    min-width: 0;
    max-width: 100%;
    padding-bottom: clamp(3rem, 7vw, 6rem);
  }

  .ramps-intro {
    max-width: 42rem;
    padding: clamp(2rem, 5vw, 3.5rem) 0 1.5rem;
  }

  .ramps-intro h1 {
    margin: 0.25rem 0 0.75rem;
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
  }

  .ramps-intro > p:not(.eyebrow, .guide-link) {
    margin: 0;
    color: var(--muted);
    font-size: 1.02rem;
  }

  .ramps-intro a {
    color: var(--ink);
  }

  .guide-link {
    margin: 0.85rem 0 0;
    color: var(--muted);
    font-size: 0.92rem;
  }

  .guide-link a {
    color: var(--ink);
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ramp-index {
    margin-bottom: 1rem;
  }
</style>
