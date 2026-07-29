<script lang="ts">
  import { base } from "$app/paths";

  import CodeTabs from "$lib/CodeTabs.svelte";
  import { FEATURED_EXAMPLES, galleryCatalog } from "$lib/catalog/gallery";
  import CopyCode from "$lib/components/CopyCode.svelte";
  import GrammarDemo from "$lib/components/GrammarDemo.svelte";
  import UiButton from "$lib/components/UiButton.svelte";
  import { EXAMPLES } from "$lib/examples-manifest";
  import { HOME_CODE_PATH_TABS } from "$lib/home-code-path";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const install = "bun add @ggsvelte/svelte";
  const entries = galleryCatalog(EXAMPLES);
  const featured = FEATURED_EXAMPLES.map((item) =>
    entries.find((entry) => entry.id === item.id)!,
  );
  const tabs = HOME_CODE_PATH_TABS;

  // Hero stays on the prerendered static SVG shell. Auto-upgrading to live
  // GGPlot on mount pulled ~1MB of chart stack and locked clicks for seconds.
  // Interactive demos live on /examples and /interactions.
</script>

<section class="home-hero" aria-labelledby="home-heading">
  <div class="hero-claim">
    <h1 id="home-heading">
      A layered grammar of graphics implemented for agents
    </h1>
    <p>
      The declarative ggplot2 mental model: Instead of picking a preset
      "BarChart" or "LineChart" component, you compose plots out of independent
      structural layers.
    </p>
  </div>

  <div class="hero-plot">
    <!--
      theme.js sets data-theme before paint. Mirror contrastChartTheme():
      fivethirtyeight on the light site, light chart on dark — no theme flash.
    -->
    <div class="hero-static hero-static--light-site">
      {@html data.heroStaticSvgLightSite}
    </div>
    <div class="hero-static hero-static--dark-site">
      {@html data.heroStaticSvgDarkSite}
    </div>
  </div>

  <div class="hero-actions">
    <CopyCode code={install} language="bash" accessibleLabel="Copy install" />
    <div class="cta-row">
      <UiButton variant="primary" href={`${base}/guide/getting-started`}>
        Getting started
      </UiButton>
      <UiButton href={`${base}/examples`}>Examples</UiButton>
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

<GrammarDemo
  staticSvgLightSite={data.grammarStaticSvgLightSite}
  staticSvgDarkSite={data.grammarStaticSvgDarkSite}
/>

<section class="code-path" aria-labelledby="code-path-heading">
  <div>
    <h2 id="code-path-heading">
      Svelte for builders, JSON for embedded agents.
    </h2>
    <p>
      Human-agent pairs get Svelte components for clarity. Embedded agents can
      use JSON specs for interactive charts on demand.
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
      <dt>Themes</dt>
      <dd>
        <a href={`${base}/themes`}>Built-in chart themes</a>
      </dd>
    </div>
    <div>
      <dt>Palettes</dt>
      <dd>
        <a href={`${base}/palettes`}
          >Categorical palettes and sequential scales</a
        >
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
        <a href={`${base}/guide/production`}>No-DOM renderer and CLI</a>
      </dd>
    </div>
  </dl>
</section>

<style>
  /*
   * Stack by default: the chart is the hero and owns a full-width row until
   * the viewport is wide enough for a true two-column composition.
   * Never pin min-height to 100svh — a two-row grid under that rule stretches
   * empty space between claim and actions into a multi-hundred-px void.
   */
  .home-hero {
    display: grid;
    grid-template-areas: "claim" "plot" "actions";
    grid-template-columns: 1fr;
    gap: 1.5rem;
    align-items: start;
    padding: clamp(2rem, 5vw, 4rem) 0 3rem;
  }

  .hero-claim {
    grid-area: claim;
  }

  .hero-claim h1 {
    max-width: 16ch;
    margin: 0.35rem 0 1.25rem;
    font-size: clamp(2.8rem, 5.5vw, 4.75rem);
    line-height: 0.95;
    letter-spacing: -0.04em;
  }

  .hero-claim > p:last-child {
    max-width: 36rem;
    color: var(--muted);
    font-size: 1.08rem;
  }

  .hero-actions {
    grid-area: actions;
    max-width: 34rem;
  }

  .hero-plot {
    grid-area: plot;
    min-width: 0;
  }

  .hero-plot :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }

  .hero-static--dark-site {
    display: none;
  }

  :global(:root[data-theme="dark"]) .hero-static--light-site {
    display: none;
  }

  :global(:root[data-theme="dark"]) .hero-static--dark-site {
    display: block;
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
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
  .evidence h2 {
    max-width: 13ch;
    margin: 0.25rem 0 0;
    font-size: clamp(2.5rem, 5vw, 4.75rem);
    line-height: 0.94;
  }

  .code-path h2 {
    max-width: 14ch;
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

  /* Side-by-side only when claim + chart can coexist without squeezing the hero. */
  @media (min-width: 72rem) {
    .home-hero {
      grid-template-areas: "claim plot" "actions plot";
      grid-template-columns: minmax(16rem, 0.85fr) minmax(0, 1.15fr);
      gap: 1.25rem clamp(1.5rem, 3vw, 3rem);
    }
  }

  @media (max-width: 64rem) {
    .home-featured ol {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 42rem) {
    .home-hero {
      padding-top: 1.5rem;
    }

    .hero-claim h1 {
      font-size: clamp(2.4rem, 11vw, 3.5rem);
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
