<script lang="ts">
  import { base } from "$app/paths";

  import ChartThemeLab from "$lib/components/ChartThemeLab.svelte";
  import PaletteGallery from "$lib/components/PaletteGallery.svelte";
  import SequentialColorLab from "$lib/components/SequentialColorLab.svelte";
  import ThemeSpecimen from "$lib/components/ThemeSpecimen.svelte";
  import { THEME_SPECIMENS } from "$lib/theme-specimens/catalog";
</script>

<main class="themes-page">
  <header class="themes-intro">
    <p class="eyebrow">Themes</p>
    <h1>Themes and color</h1>
    <p>
      Chart themes style paper, grids, axes, and type. Palettes encode data.
      Site light/dark is separate unless you wire them yourself.
    </p>
    <p class="guide-link">
      Token-level theme and scale reference:
      <a href={`${base}/guide/themes-color`}>Themes and color guide</a>.
    </p>
  </header>

  <ChartThemeLab />

  <section class="theme-collection" aria-labelledby="built-in-themes-heading">
    <header class="section-heading">
      <p class="eyebrow">Built-in</p>
      <h2 id="built-in-themes-heading">Chart themes</h2>
    </header>
    <ol aria-label="Built-in chart themes">
      {#each THEME_SPECIMENS as specimen (specimen.name)}
        <li>
          <ThemeSpecimen
            name={specimen.name}
            label={specimen.label}
            caption={specimen.caption}
            kind={specimen.kind}
            scheme={specimen.scheme}
            legendFocus={specimen.legendFocus}
          />
        </li>
      {/each}
    </ol>
  </section>

  <PaletteGallery />
  <SequentialColorLab />

  <nav class="learning-path" aria-label="Next steps">
    <p class="eyebrow">Next</p>
    <ul>
      <li>
        <a href={`${base}/guide/themes-color`}>Themes and color guide</a>
        — prop model and color rules
      </li>
      <li>
        <a href={`${base}/examples/line/multi-series`}>Multi-series line</a>,
        <a href={`${base}/examples/area/stacked`}>stacked area</a>,
        <a href={`${base}/examples/bar/dodged`}>dodged bars</a>
        — gallery sources for these charts
      </li>
      <li>
        <a href={`${base}/examples/interaction/tooltip`}>Inspect</a>
        and
        <a href={`${base}/examples/interaction/legend-focus`}>legend focus</a>
        — interaction props used on this page
      </li>
    </ul>
  </nav>
</main>

<style>
  .themes-page {
    min-width: 0;
    max-width: 100%;
    padding-bottom: clamp(3rem, 7vw, 6rem);
  }

  .themes-intro {
    max-width: 42rem;
    padding: clamp(2rem, 5vw, 3.5rem) 0 1.5rem;
  }

  .themes-intro h1 {
    margin: 0.25rem 0 0.75rem;
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
  }

  .themes-intro > p:not(.eyebrow, .guide-link) {
    margin: 0;
    color: var(--muted);
    font-size: 1.02rem;
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

  .theme-collection {
    padding-block: clamp(2.5rem, 6vw, 4.5rem);
    border-top: 1px solid var(--line);
  }

  .section-heading {
    margin-bottom: 1.5rem;
  }

  .section-heading h2 {
    margin: 0.2rem 0 0;
    font-size: clamp(1.75rem, 3.5vw, 2.5rem);
    line-height: 1;
    letter-spacing: -0.02em;
  }

  ol {
    display: grid;
    grid-template-columns: 1fr;
    gap: clamp(2.5rem, 5vw, 4rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ol > li {
    min-width: 0;
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
