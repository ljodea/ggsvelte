<script lang="ts">
  import { base } from "$app/paths";
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";

  import { penguins } from "$examples/point/scatter-color/data";
  import { QUICKSTART_PAGE_SVELTE } from "$scripts/quickstart";
  import CodeTabs from "$lib/CodeTabs.svelte";
  import { FEATURED_EXAMPLES, galleryEntryFor } from "$lib/catalog/gallery";
  import CopyCode from "$lib/components/CopyCode.svelte";
  import GrammarDemo from "$lib/components/GrammarDemo.svelte";
  import UiButton from "$lib/components/UiButton.svelte";
  import { contrastChartTheme } from "$lib/docs-appearance-state.svelte";
  import { EXAMPLES } from "$lib/examples";

  const install = "npm install @ggsvelte/svelte";
  const entries = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const featured = FEATURED_EXAMPLES.map((item) =>
    entries.find((entry) => entry.id === item.id)!,
  );
  const heroTheme = $derived(contrastChartTheme());
  const tabs = [
    { label: "Svelte", code: QUICKSTART_PAGE_SVELTE, language: "svelte" },
    {
      label: "Builder (TS)",
      language: "typescript",
      code: `import { aes, gg } from "@ggsvelte/svelte";\n\nconst spec = gg(cars, aes({ x: "weight", y: "economy" }))\n  .geomPoint()\n  .spec();`,
    },
    {
      label: "Spec (JSON)",
      language: "json",
      code: `{
  "data": {
    "values": [{ "weight": 1.8, "economy": 37 }]
  },
  "layers": [
    {
      "geom": "point",
      "aes": {
        "x": { "field": "weight" },
        "y": { "field": "economy" }
      }
    }
  ]
}`,
    },
  ];
</script>

<section class="home-hero" aria-labelledby="home-heading">
  <div class="hero-claim">
    <h1 id="home-heading">
      An agent-first implementation of the layered grammar of graphics in Svelte
      5
    </h1>
    <p>
      ggplot2's layered grammar and defaults as Svelte components, a TypeScript
      builder, and a validated JSON spec agents can write. Inspection,
      selection, and zoom are part of the spec.
    </p>
  </div>

  <div class="hero-plot">
    <GGPlot
      data={penguins}
      aes={{ x: "flipper", y: "mass", color: "species" }}
      inspect={{ mode: "x", pin: true, maxDistance: 24 }}
      theme={heroTheme}
      labs={{
        title: "Penguin body mass by flipper length",
        x: "Flipper length (mm)",
        y: "Body mass (g)",
        color: "Species",
      }}
      width="container"
      height={400}
      ariaLabel="Penguin mass increases with flipper length, grouped by species"
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
    <h2 id="code-path-heading">Svelte, builder, or JSON.</h2>
    <p>
      Three surfaces, one spec. Svelte components inside an app, the TypeScript
      builder anywhere else, and PortableSpec JSON — the surface agents write:
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
        <a href={`${base}/guide/getting-started#headless-and-server-rendering`}
          >No-DOM renderer and CLI</a
        >
      </dd>
    </div>
  </dl>
</section>

<style>
  .home-hero {
    display: grid;
    grid-template-areas: "claim plot" "actions plot";
    grid-template-columns: minmax(18rem, 0.85fr) minmax(30rem, 1.15fr);
    gap: 1.5rem clamp(2rem, 6vw, 6rem);
    align-items: start;
    min-height: calc(100svh - 8rem);
    padding: clamp(3rem, 7vw, 7rem) 0 4rem;
  }

  .hero-claim {
    grid-area: claim;
  }

  .hero-claim h1 {
    max-width: 14ch;
    margin: 0.35rem 0 1.25rem;
    font-size: clamp(3.2rem, 6vw, 6rem);
    line-height: 0.9;
    letter-spacing: -0.045em;
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
    .home-hero {
      grid-template-areas: "claim" "plot" "actions";
      grid-template-columns: 1fr;
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

    .hero-claim h1 {
      font-size: clamp(2.6rem, 12vw, 4rem);
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
