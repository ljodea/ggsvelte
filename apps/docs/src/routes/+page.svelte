<script lang="ts">
  import { base } from "$app/paths";

  import SignaturePlot from "$examples/interaction/tooltip/Example.svelte";
  import { QUICKSTART_PAGE_SVELTE } from "$scripts/quickstart";
  import CodeTabs from "$lib/CodeTabs.svelte";
  import { FEATURED_EXAMPLES, galleryEntryFor } from "$lib/catalog/gallery";
  import CopyCode from "$lib/components/CopyCode.svelte";
  import GrammarDemo from "$lib/components/GrammarDemo.svelte";
  import { EXAMPLES } from "$lib/examples";

  const install = "npm install @ggsvelte/svelte";
  const entries = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const featured = FEATURED_EXAMPLES.map((item) =>
    entries.find((entry) => entry.id === item.id)!,
  );
  const tabs = [
    { label: "Svelte", code: QUICKSTART_PAGE_SVELTE },
    {
      label: "Builder (TS)",
      code: `import { aes, gg } from "@ggsvelte/svelte";\n\nconst spec = gg(cars, aes({ x: "weight", y: "economy" }))\n  .geomPoint()\n  .spec();`,
    },
    {
      label: "Spec (JSON)",
      code: `{"data":{"values":[{"weight":1.8,"economy":37}]},"layers":[{"geom":"point","aes":{"x":{"field":"weight"},"y":{"field":"economy"}}}]}`,
    },
  ];
</script>

<section class="home-hero" aria-labelledby="home-heading">
  <div class="hero-claim">
    <p class="eyebrow">A grammar of graphics for Svelte</p>
    <h1 id="home-heading">Build charts that explain themselves.</h1>
    <p>
      Compose data, mappings, layers, scales, and interaction in Svelte. Start
      with a useful chart; keep the portable specification when you need to
      validate, render, or share it.
    </p>
  </div>

  <div class="hero-plot">
    <div class="specimen-label">
      <span>Live specimen</span>
      <a href={`${base}/examples/interactions/inspection`}
        >Inspect a live plot</a
      >
    </div>
    <SignaturePlot />
  </div>

  <div class="hero-actions">
    <CopyCode code={install} label="Copy install" />
    <div class="cta-row">
      <a class="primary-action" href={`${base}/guide/getting-started`}
        >Build your first chart</a
      >
      <a class="secondary-action" href={`${base}/examples`}
        >Browse the gallery</a
      >
    </div>
    <p>
      No account, service, or chart CSS required. <a href={`${base}/playground`}
        >Use my data</a
      > locally.
    </p>
  </div>
</section>

<section class="home-featured" aria-labelledby="home-featured-heading">
  <header>
    <div>
      <p class="eyebrow">Six production jobs</p>
      <h2 id="home-featured-heading">Start from the question, not the geom.</h2>
    </div>
    <a href={`${base}/examples`}>See all {entries.length} examples</a>
  </header>
  <ol>
    {#each featured as entry (entry.id)}
      <li>
        <a href={`${base}/examples/${entry.id}`}>
          <figure>
            <div class="preview-paper">
              <img
                src={`${base}${entry.previewPath}`}
                alt=""
                width="640"
                height={entry.vrHeight ?? 400}
              />
            </div>
            <figcaption>
              <span>{entry.featured!.note}</span>
              <strong>{entry.featured!.jobTitle}</strong>
            </figcaption>
          </figure>
        </a>
      </li>
    {/each}
  </ol>
</section>

<GrammarDemo />

<section class="code-path" aria-labelledby="code-path-heading">
  <div>
    <p class="eyebrow">One chart, deliberate surfaces</p>
    <h2 id="code-path-heading">Write Svelte first.</h2>
    <p>
      The complete component is the shortest path to a visible result. Switch
      only when you need generated TypeScript or portable JSON.
    </p>
  </div>
  <CodeTabs {tabs} />
</section>

<section class="evidence" aria-labelledby="evidence-heading">
  <header>
    <p class="eyebrow">Before you ship</p>
    <h2 id="evidence-heading">Check the boundary, not a badge.</h2>
  </header>
  <dl>
    <div>
      <dt>Will it work in my stack?</dt>
      <dd>
        <a href={`${base}/guide/compatibility`}
          >Read the tested compatibility matrix</a
        >.
      </dd>
    </div>
    <div>
      <dt>What happens when a spec is wrong?</dt>
      <dd>
        <a href={`${base}/guide/errors`}
          >Follow stable diagnostics and safe fixes</a
        >.
      </dd>
    </div>
    <div>
      <dt>Can I render without a browser?</dt>
      <dd>
        <a href={`${base}/guide/getting-started#headless-and-server-rendering`}
          >Use the no-DOM renderer or CLI</a
        >.
      </dd>
    </div>
    <div>
      <dt>Can another system emit a chart safely?</dt>
      <dd>
        <a href={`${base}/schema/v0.json`}
          >Validate against the PortableSpec JSON Schema</a
        >.
      </dd>
    </div>
  </dl>
</section>

<style>
  .eyebrow,
  .specimen-label span,
  figcaption span {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

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
    max-width: 10ch;
    margin: 0.35rem 0 1.25rem;
    font-size: clamp(4rem, 7.6vw, 8rem);
    line-height: 0.82;
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

  .hero-actions > p {
    color: var(--muted);
    font-size: 0.82rem;
  }

  .hero-plot {
    grid-area: plot;
    min-width: 0;
    border: 1px solid var(--line);
    background: #fff;
    color: #172033;
  }

  .hero-plot :global(.event-status) {
    min-height: 2.7rem;
    margin: 0;
    padding: 0.75rem 1rem;
    border-top: 1px solid #d9dee8;
    color: #5e6878;
  }

  .specimen-label {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #d9dee8;
  }

  .specimen-label a {
    color: inherit;
    font-size: 0.82rem;
    font-weight: 600;
  }

  .cta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .cta-row a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0.65rem 1rem;
    border: 1px solid var(--ink);
    border-radius: 4px;
    font-weight: 600;
    text-decoration: none;
  }

  .primary-action {
    background: var(--ink);
    color: var(--paper);
  }

  .secondary-action {
    color: var(--ink);
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
    gap: 2rem 1.25rem;
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

  .preview-paper {
    display: grid;
    aspect-ratio: 4 / 3;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--line);
    background: #fff;
  }

  .preview-paper img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  figcaption {
    display: grid;
    gap: 0.35rem;
    padding-top: 0.75rem;
  }

  figcaption strong {
    font: 700 1.25rem/1.05 var(--display-font);
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

    .hero-claim h1 {
      max-width: 12ch;
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
      font-size: clamp(3.4rem, 17vw, 5rem);
    }

    .specimen-label {
      align-items: start;
      flex-direction: column;
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
