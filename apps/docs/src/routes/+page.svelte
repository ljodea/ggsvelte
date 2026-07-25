<script lang="ts">
  import { base } from "$app/paths";
  import type { PlotInspectionChange } from "@ggsvelte/svelte";
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { guerry } from "$examples/point/scatter-color/data";
  import CodeTabs from "$lib/CodeTabs.svelte";
  import { FEATURED_EXAMPLES, galleryEntryFor } from "$lib/catalog/gallery";
  import CopyCode from "$lib/components/CopyCode.svelte";
  import GrammarDemo from "$lib/components/GrammarDemo.svelte";
  import UiButton from "$lib/components/UiButton.svelte";
  import { contrastChartTheme } from "$lib/docs-appearance-state.svelte";
  import { EXAMPLES } from "$lib/examples";
  import { HOME_CODE_PATH_TABS } from "$lib/home-code-path";

  type GuerryRow = (typeof guerry)[number];

  const install = "bun install @ggsvelte/svelte";
  const entries = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const featured = FEATURED_EXAMPLES.map((item) =>
    entries.find((entry) => entry.id === item.id)!,
  );
  const heroTheme = $derived(contrastChartTheme());
  const tabs = HOME_CODE_PATH_TABS;
</script>

<section class="home-hero" aria-labelledby="home-heading">
  <div class="hero-claim">
    <h1 id="home-heading">
      A layered grammar of graphics implemented for agents
    </h1>
    <p>
      ggplot2's layered grammar and defaults as Svelte components, a TypeScript
      builder, and a validated JSON spec agents can write. Inspection,
      selection, and zoom are part of the spec.
    </p>
  </div>

  <div class="hero-plot">
    <!--
      Exact point inspection (not mode "x"): no vertical axis guide, one
      department at a time. Custom content names the department and uses
      readable labels — default tooltips still show raw column names for
      unmapped identity fields (#752).
    -->
    {#snippet heroTooltip(
      inspection: PlotInspectionChange<Record<string, unknown>, PropertyKey>,
    )}
      {@const row = inspection.focus.row as GuerryRow | null}
      {#if row}
        <div class="hero-tooltip">
          <div class="hero-tooltip-title">{row.department}</div>
          <dl>
            <dt>literacy</dt>
            <dd>{row.literacy}%</dd>
            <dt>pop. per crime</dt>
            <dd>{row.crimePersons}</dd>
            <dt>region</dt>
            <dd>{row.region}</dd>
          </dl>
        </div>
      {/if}
    {/snippet}
    <GGPlot
      data={guerry}
      aes={{ x: "literacy", y: "crimePersons", color: "region" }}
      inspect={{
        mode: "exact",
        pin: true,
        maxDistance: 24,
        content: heroTooltip,
      }}
      theme={heroTheme}
      scales={{ color: { type: "ordinal", scheme: "tableau10" } }}
      labs={{
        title: "Literacy and crime in France, 1833",
        subtitle:
          "85 French departments — higher y means fewer crimes per head",
        x: "Literate conscripts (%)",
        y: "Population per crime against persons",
        color: "Region",
      }}
      width="container"
      height={400}
      ariaLabel="Literacy percentage against population per crime against persons for 85 French departments, coloured by region"
    >
      <GeomPoint size={4} alpha={0.85} />
    </GGPlot>
  </div>

  <div class="hero-actions">
    <CopyCode code={install} language="bash" accessibleLabel="Copy install" />
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
    <h2 id="code-path-heading">Svelte for builders, JSON for operations.</h2>
    <p>
      Svelte components help human-agent teams reason about viz work together,
      thanks to ggplot2 naming conventions that have been around for 18 years.
      JSON specs allow agents operating in webapps to make interactive charts on
      demand for rendering on-the-fly.
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

  .hero-tooltip-title {
    margin-bottom: 0.35rem;
    font-weight: 650;
  }

  .hero-tooltip dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto auto;
    gap: 0 0.75rem;
  }

  .hero-tooltip dt {
    font-weight: 600;
  }

  .hero-tooltip dd {
    margin: 0;
    text-align: right;
    font-variant-numeric: tabular-nums;
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
