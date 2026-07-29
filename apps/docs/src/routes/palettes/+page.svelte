<script lang="ts">
  import { base } from "$app/paths";

  import PaletteGallery from "$lib/components/PaletteGallery.svelte";
  import SequentialColorLab from "$lib/components/SequentialColorLab.svelte";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<main class="palettes-page">
  <header class="palettes-intro">
    <p class="eyebrow">Palettes</p>
    <h1>Color palettes</h1>
    <p>
      Categorical schemes color discrete series. Sequential ramps encode
      continuous fill. Chart themes style paper and chrome separately — see
      <a href={`${base}/themes`}>Themes</a>.
    </p>
    <p class="guide-link">
      How to set a palette on a plot:
      <a href={`${base}/reference/scales`}>Scale reference</a>
      (e.g.
      <a href={`${base}/reference/scales/color_discrete`}>ScaleColorDiscrete</a
      >,
      <a href={`${base}/reference/scales/color_continuous`}
        >ScaleColorContinuous</a
      >). Narrative guide:
      <a href={`${base}/guide/scales-guides`}>Scales and guides</a>.
    </p>
  </header>

  <PaletteGallery specimens={data.paletteSpecimens} />
  <SequentialColorLab examples={data.sequentialExamples} />

  <nav class="learning-path" aria-label="Next steps">
    <p class="eyebrow">Next</p>
    <ul>
      <li>
        <a href={`${base}/themes`}>Themes</a>
        — paper, grids, axes, and type
      </li>
      <li>
        <a href={`${base}/reference/scales`}>Scale reference</a>
        — every Scale* component and how to set color on a plot
      </li>
      <li>
        <a href={`${base}/guide/scales-guides`}>Scales and guides</a>
        — position, color, and legend channels
      </li>
      <li>
        <a href={`${base}/examples/bar/dodged`}>Dodged bars</a>,
        <a href={`${base}/examples/line/multi-series`}>multi-series line</a>,
        <a href={`${base}/examples/area/stacked`}>stacked area</a>
        — gallery sources for categorical color
      </li>
    </ul>
  </nav>
</main>

<style>
  .palettes-page {
    min-width: 0;
    max-width: 100%;
    padding-bottom: clamp(3rem, 7vw, 6rem);
  }

  .palettes-intro {
    max-width: 42rem;
    padding: clamp(2rem, 5vw, 3.5rem) 0 1.5rem;
  }

  .palettes-intro h1 {
    margin: 0.25rem 0 0.75rem;
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
  }

  .palettes-intro > p:not(.eyebrow, .guide-link) {
    margin: 0;
    color: var(--muted);
    font-size: 1.02rem;
  }

  .palettes-intro a {
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

  .learning-path {
    padding-block: clamp(2rem, 5vw, 3.5rem);
    border-top: 1px solid var(--line);
  }

  .learning-path ul {
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.55rem;
    max-width: 42rem;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.45;
  }

  .learning-path a {
    color: var(--ink);
  }
</style>
