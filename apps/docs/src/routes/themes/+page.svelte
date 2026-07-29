<script lang="ts">
  import { base } from "$app/paths";

  import ChartThemeLab from "$lib/components/ChartThemeLab.svelte";
  import ThemeSpecimen from "$lib/components/ThemeSpecimen.svelte";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
</script>

<main class="themes-page">
  <header class="themes-intro">
    <p class="eyebrow">Themes</p>
    <h1>Chart themes</h1>
  </header>

  <ChartThemeLab initialStaticSrc={data.labStaticSrc} />

  <section class="theme-collection" aria-labelledby="built-in-themes-heading">
    <header class="section-heading">
      <p class="eyebrow">Built-in</p>
      <h2 id="built-in-themes-heading">Chart themes</h2>
    </header>
    <ol aria-label="Built-in chart themes">
      {#each data.themeSpecimens as specimen, index (specimen.name)}
        <li>
          <ThemeSpecimen
            name={specimen.name}
            label={specimen.label}
            caption={specimen.caption}
            kind={specimen.kind}
            scheme={specimen.scheme}
            legendFocus={specimen.legendFocus}
            staticSrc={specimen.staticSrc}
            eager={index === 0}
          />
        </li>
      {/each}
    </ol>
  </section>

  <nav class="learning-path" aria-label="Next steps">
    <p class="eyebrow">Next</p>
    <ul>
      <li>
        <a href={`${base}/palettes`}>Palettes</a>
        — categorical schemes and sequential ramps
      </li>
      <li>
        <a href={`${base}/guide/scales-guides`}>Scales and guides</a>
        — position, color, and legend channels
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
    margin: 0.25rem 0 0;
    font-size: clamp(2.25rem, 5vw, 3.5rem);
    line-height: 0.95;
    letter-spacing: -0.03em;
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
    gap: clamp(2.5rem, 5vw, 4rem);
    margin: 0;
    padding: 0;
    list-style: none;
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
    gap: 0.65rem;
  }

  .learning-path a {
    color: var(--ink);
  }
</style>
