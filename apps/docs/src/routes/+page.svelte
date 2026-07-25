<script lang="ts">
  import { base } from "$app/paths";
  import { GGPlot } from "@ggsvelte/svelte";
  import { kyotoSakura } from "@ggsvelte/svelte/data";

  import {
    foldSakura,
    QUICKSTART_BUILDER_FRAGMENT,
    QUICKSTART_PORTABLE_SPEC_FRAGMENT,
    SAKURA_FINISHED_SVELTE,
    SAKURA_STEPS,
  } from "$scripts/quickstart";
  import CodeTabs from "$lib/CodeTabs.svelte";
  import { FEATURED_EXAMPLES, galleryEntryFor } from "$lib/catalog/gallery";
  import CopyCode from "$lib/components/CopyCode.svelte";
  import GrammarDemo from "$lib/components/GrammarDemo.svelte";
  import UiButton from "$lib/components/UiButton.svelte";
  import { EXAMPLES } from "$lib/examples";

  const install = "npm install @ggsvelte/svelte";
  const entries = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const featured = FEATURED_EXAMPLES.map((item) =>
    entries.find((entry) => entry.id === item.id)!,
  );
  // The hero is the getting-started chart, finished: same fold, same spec.
  const hero = foldSakura(
    SAKURA_STEPS.length,
    kyotoSakura.map((row) => ({ ...row })),
  );
  const tabs = [
    { label: "Svelte", code: SAKURA_FINISHED_SVELTE, language: "svelte" },
    {
      label: "Builder (TS)",
      language: "typescript",
      code: QUICKSTART_BUILDER_FRAGMENT,
    },
    {
      label: "Spec (JSON)",
      language: "json",
      code: QUICKSTART_PORTABLE_SPEC_FRAGMENT,
    },
  ];
</script>

<section class="home-hero" aria-labelledby="home-heading">
  <div class="hero-masthead">
    <h1 id="home-heading">
      The layered grammar of graphics, in Svelte 5 — and in JSON
    </h1>
    <p>
      ggplot2's grammar and defaults as Svelte components, a TypeScript builder,
      and a validated spec agents can write. Inspection, selection and zoom are
      part of the spec.
    </p>
    <CopyCode code={install} language="bash" accessibleLabel="Copy install" />
  </div>

  <div class="hero-plot">
    <GGPlot
      spec={hero.spec}
      key={hero.key}
      inspect={hero.inspect}
      width="container"
      height={480}
      ariaLabel={"Kyoto peak cherry-blossom dates, 812 to 2026: stable near " +
        "mid-April for a millennium, then about a week earlier since 1850"}
    />
  </div>

  <div class="hero-actions">
    <p class="hero-caption">
      838 observations, six grammar elements, one file — built step by step in
      <a href={`${base}/guide/getting-started`}>Getting started</a>.
    </p>
    <div class="cta-row">
      <UiButton variant="primary" href={`${base}/guide/getting-started`}>
        Getting started
      </UiButton>
      <UiButton href={`${base}/examples`}>Examples</UiButton>
      <UiButton variant="ghost" href={`${base}/playground`}>Playground</UiButton
      >
    </div>
  </div>
</section>

<section class="home-featured" aria-labelledby="home-featured-heading">
  <header>
    <h2 id="home-featured-heading">Examples</h2>
    <a href={`${base}/examples`}>Gallery</a>
  </header>
  <ol>
    {#each featured as entry (entry.id)}
      <li>
        <a href={`${base}/examples/${entry.id}`} aria-label={entry.title}>
          <figure>
            <div class="preview-paper">
              <img
                src={`${base}${entry.previewPath}`}
                alt=""
                width="640"
                height={entry.vrHeight ?? 400}
              />
            </div>
          </figure>
        </a>
      </li>
    {/each}
  </ol>
</section>

<GrammarDemo />

<section class="code-path" aria-labelledby="code-path-heading">
  <div>
    <h2 id="code-path-heading">Svelte, builder, or JSON.</h2>
    <p>
      Three surfaces, one spec. Svelte components inside an app, the TypeScript
      builder anywhere else, and Spec (JSON) — the surface agents write:
      validated on the way in, rendered to SVG without a DOM.
    </p>
  </div>
  <CodeTabs {tabs} />
</section>

<section class="evidence" aria-labelledby="evidence-heading">
  <header>
    <h2 id="evidence-heading">Docs</h2>
  </header>
  <dl>
    <div>
      <dt>Getting started</dt>
      <dd>
        <a href={`${base}/guide/getting-started`}>Install and render a chart</a>
      </dd>
    </div>
    <div>
      <dt>Themes and color</dt>
      <dd>
        <a href={`${base}/themes`}>Built-in themes, palettes, scales</a>
      </dd>
    </div>
    <div>
      <dt>Interactions</dt>
      <dd>
        <a href={`${base}/interactions`}>Inspect, select, zoom, legend focus</a>
      </dd>
    </div>
    <div>
      <dt>Headless SVG</dt>
      <dd>
        <a href={`${base}/guide/server-rendering-export`}
          >No-DOM renderer and CLI</a
        >
      </dd>
    </div>
  </dl>
</section>

<style>
  .home-hero {
    display: grid;
    gap: 2rem;
    padding: clamp(2.5rem, 6vw, 5rem) 0 4rem;
  }

  /* Masthead row: claim, then the one thing to type, side by side. */
  .hero-masthead {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 1rem clamp(2rem, 6vw, 5rem);
    align-items: end;
  }

  .hero-masthead h1 {
    grid-row: span 2;
    max-width: 18ch;
    margin: 0;
    font-size: clamp(2.8rem, 5.5vw, 5rem);
    line-height: 0.92;
    letter-spacing: -0.045em;
  }

  .hero-masthead p {
    max-width: 40rem;
    margin: 0;
    color: var(--muted);
    font-size: 1.05rem;
  }

  /* The chart is the argument, so it gets the full width of the page. */
  .hero-plot {
    min-width: 0;
    margin-inline: calc(-1 * clamp(1rem, 4vw, 4rem));
    padding: 1.5rem clamp(1rem, 4vw, 4rem);
    background: #fff;
    color: #172033;
  }

  /*
   * Forced colors: the hero pins its own light surface, and the epoch bands
   * are decorative context this page never names — neither should override a
   * requested palette. Hand the surface back and drop the fills; the points,
   * the trend and the record annotations carry the chart on their own. The
   * lesson page does the same to the same chart.
   */
  @media (forced-colors: active) {
    .hero-plot {
      color: canvastext;
      background: canvas;
    }

    .hero-plot :global(.gg-marks rect) {
      fill: none;
    }
  }

  .hero-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 1rem 2rem;
  }

  .hero-caption {
    max-width: 40rem;
    margin: 0;
    color: var(--muted);
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .home-featured {
    padding-block: clamp(4rem, 8vw, 7rem);
    border-top: 1px solid var(--line);
  }

  .home-featured header,
  .evidence header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .home-featured h2,
  .code-path h2,
  .evidence h2 {
    max-width: 13ch;
    margin: 0.25rem 0 0;
    font-size: clamp(2.5rem, 5vw, 4.75rem);
    line-height: 0.94;
  }

  .home-featured ol {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  figure {
    margin: 0;
  }

  .home-featured a {
    color: inherit;
    text-decoration: none;
  }

  .home-featured header a {
    font-weight: 600;
    text-decoration: underline;
  }

  .preview-paper {
    display: grid;
    aspect-ratio: 4 / 3;
    place-items: center;
    overflow: hidden;
  }

  .preview-paper img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .code-path {
    display: grid;
    grid-template-columns: minmax(16rem, 0.65fr) minmax(0, 1.35fr);
    gap: clamp(2rem, 6vw, 6rem);
    padding-block: clamp(4rem, 9vw, 8rem);
  }

  .code-path > div:first-child > p:last-child {
    color: var(--muted);
  }

  .evidence {
    padding-block: clamp(4rem, 8vw, 7rem);
    border-top: 1px solid var(--line);
  }

  .evidence dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0;
    border-top: 1px solid var(--line);
  }

  .evidence dl > div {
    padding: 1.5rem 1.5rem 1.5rem 0;
    border-bottom: 1px solid var(--line);
  }

  .evidence dt {
    font: 700 1.4rem/1.1 var(--display-font);
  }

  .evidence dd {
    margin: 0.5rem 0 0;
    color: var(--muted);
  }

  @media (max-width: 64rem) {
    .hero-masthead {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .hero-masthead h1 {
      grid-row: auto;
    }

    .home-featured ol {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 42rem) {
    .home-hero {
      min-height: 0;
      padding-top: 2rem;
    }

    .hero-masthead h1 {
      font-size: clamp(2.4rem, 11vw, 3.6rem);
    }

    .home-featured {
      margin-inline: -1rem;
    }

    .home-featured header {
      align-items: start;
      margin-inline: 1rem;
    }

    .home-featured ol {
      grid-auto-columns: min(85vw, 21rem);
      grid-template-columns: none;
      grid-auto-flow: column;
      gap: 1rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-inline: 1rem;
    }

    .home-featured li {
      scroll-snap-align: start;
    }

    .code-path,
    .evidence dl {
      grid-template-columns: 1fr;
    }
  }
</style>
