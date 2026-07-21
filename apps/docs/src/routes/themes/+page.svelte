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
    <h1>Themes and color</h1>
    <p>
      Twelve chart themes on identical data, plus categorical schemes,
      sequential ramps, palette exhaustion, and interaction role colors.
    </p>
  </header>

  <ChartThemeLab />

  <section class="theme-collection" aria-labelledby="built-in-themes-heading">
    <header class="section-heading">
      <div>
        <p class="eyebrow">Built-in</p>
        <h2 id="built-in-themes-heading">Chart themes</h2>
      </div>
      <p>
        Spec fixed; only <code>theme</code> changes.
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
    /* Contain wide specimens / display type so document scrollWidth stays viewport-bound. */
    min-width: 0;
    max-width: 100%;
    overflow-x: clip;
    padding-bottom: clamp(4rem, 9vw, 8rem);
  }

  .themes-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.55fr);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: end;
    min-width: 0;
    min-height: min(46rem, calc(100svh - 8rem));
    padding-block: clamp(4rem, 9vw, 8rem);
  }

  .themes-hero h1 {
    grid-column: 1;
    /* ch-box + display face can overflow max-width without wrap/clip (scrollWidth expands). */
    max-width: min(10ch, 100%);
    min-width: 0;
    margin: 0.35rem 0 0;
    overflow-wrap: anywhere;
    font-size: clamp(4rem, 8vw, 8rem);
    line-height: 0.84;
    letter-spacing: -0.045em;
  }

  .themes-hero > p:last-child {
    grid-column: 2;
    min-width: 0;
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
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.45fr);
    gap: 2rem;
    align-items: end;
    min-width: 0;
    margin-bottom: 2rem;
  }

  .section-heading h2 {
    max-width: min(12ch, 100%);
    min-width: 0;
    margin: 0.25rem 0 0;
    overflow-wrap: anywhere;
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
