<script lang="ts">
  import { THEME_OPTIONS } from "$lib/catalog/themes";
  import ChartThemeLab from "$lib/components/ChartThemeLab.svelte";
  import ColorFailureDemo from "$lib/components/ColorFailureDemo.svelte";
  import InteractiveThemeSpecimen from "$lib/components/InteractiveThemeSpecimen.svelte";
  import PaletteGallery from "$lib/components/PaletteGallery.svelte";
  import SequentialColorLab from "$lib/components/SequentialColorLab.svelte";
  import ThemeSpecimen from "$lib/components/ThemeSpecimen.svelte";
</script>

<main class="themes-page">
  <header class="themes-hero">
    <p class="eyebrow">Themes & color</p>
    <h1>Design the chart, not the plumbing.</h1>
    <p>
      Compare every built-in chart theme on the same data, then choose
      categorical and sequential color behavior with explicit, portable scale
      settings.
    </p>
  </header>

  <ChartThemeLab />

  <section class="theme-collection" aria-labelledby="built-in-themes-heading">
    <header class="section-heading">
      <div>
        <p class="eyebrow">Twelve registered themes</p>
        <h2 id="built-in-themes-heading">One chart. Twelve visual systems.</h2>
      </div>
      <p>
        Data, mappings, layers, labels, and dimensions stay fixed. Only the
        chart theme changes.
      </p>
    </header>
    <ol aria-label="Built-in chart themes">
      {#each THEME_OPTIONS as theme (theme.name)}
        <li><ThemeSpecimen name={theme.name} label={theme.label} /></li>
      {/each}
    </ol>
  </section>

  <PaletteGallery />
  <SequentialColorLab />
  <ColorFailureDemo />
  <InteractiveThemeSpecimen />
</main>

<style>
  .themes-page {
    padding-bottom: clamp(4rem, 9vw, 8rem);
  }

  .themes-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(18rem, 0.55fr);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: end;
    min-height: min(46rem, calc(100svh - 8rem));
    padding-block: clamp(4rem, 9vw, 8rem);
  }

  .themes-hero h1 {
    grid-column: 1;
    max-width: 10ch;
    margin: 0.35rem 0 0;
    font-size: clamp(4rem, 8vw, 8rem);
    line-height: 0.84;
    letter-spacing: -0.045em;
  }

  .themes-hero > p:last-child {
    grid-column: 2;
    margin: 0 0 0.5rem;
    color: var(--muted);
    font-size: 1.05rem;
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
    padding-block: clamp(4rem, 8vw, 7rem);
    border-top: 1px solid var(--line);
  }

  .section-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 0.45fr);
    gap: 2rem;
    align-items: end;
    margin-bottom: 2rem;
  }

  .section-heading h2 {
    max-width: 12ch;
    margin: 0.25rem 0 0;
    font-size: clamp(2.5rem, 5vw, 4.75rem);
    line-height: 0.94;
  }

  .section-heading > p {
    color: var(--muted);
  }

  ol {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  @media (max-width: 72rem) {
    ol {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 50rem) {
    .themes-hero,
    .section-heading {
      grid-template-columns: 1fr;
    }

    .themes-hero {
      min-height: 0;
    }

    .themes-hero h1,
    .themes-hero > p:last-child {
      grid-column: 1;
    }

    ol {
      grid-template-columns: 1fr;
    }
  }
</style>
