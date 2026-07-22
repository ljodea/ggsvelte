<script lang="ts">
  import { THEME_OPTIONS } from "$lib/catalog/themes";
  import ChartThemeLab from "$lib/components/ChartThemeLab.svelte";
  import PaletteGallery from "$lib/components/PaletteGallery.svelte";
  import SequentialColorLab from "$lib/components/SequentialColorLab.svelte";
  import ThemeSpecimen from "$lib/components/ThemeSpecimen.svelte";
</script>

<main class="themes-page">
  <header class="themes-intro">
    <p class="eyebrow">Themes</p>
    <h1>Themes and color</h1>
    <p>
      Built-in chart themes, categorical palettes, and sequential scales. Chart
      theme is independent of site light/dark.
    </p>
  </header>

  <ChartThemeLab />

  <section class="theme-collection" aria-labelledby="built-in-themes-heading">
    <header class="section-heading">
      <p class="eyebrow">Built-in</p>
      <h2 id="built-in-themes-heading">Chart themes</h2>
    </header>
    <ol aria-label="Built-in chart themes">
      {#each THEME_OPTIONS as theme (theme.name)}
        <li>
          <ThemeSpecimen
            name={theme.name}
            label={theme.label}
            scheme={theme.scheme}
          />
        </li>
      {/each}
    </ol>
  </section>

  <PaletteGallery />
  <SequentialColorLab />
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

  .themes-intro > p:last-child {
    margin: 0;
    color: var(--muted);
    font-size: 1.02rem;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: clamp(2rem, 4vw, 3rem) clamp(1.5rem, 3vw, 2.5rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  ol > li {
    min-width: 0;
  }

  @media (max-width: 50rem) {
    ol {
      grid-template-columns: 1fr;
    }
  }
</style>
