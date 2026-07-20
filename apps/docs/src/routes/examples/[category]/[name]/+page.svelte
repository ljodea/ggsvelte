<script lang="ts">
  import { base } from "$app/paths";

  import CodeTabs from "$lib/CodeTabs.svelte";
  import { galleryEntryFor } from "$lib/catalog/gallery";
  import { EXAMPLES } from "$lib/examples";
  import { rankRelatedExamples } from "$lib/gallery-filter";
  import { PLAYGROUND_EXAMPLES } from "$lib/generated/playground-seeds";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
  const Example = $derived(data.component);
  const frameWidth = 640;
  const frameHeight = $derived(data.entry.vrHeight ?? 400);
  const galleryEntries = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const galleryEntry = $derived(galleryEntryFor(data.entry));
  const related = $derived(
    rankRelatedExamples(data.entry.id, galleryEntries, 3),
  );
  const playgroundCompatibility = $derived(
    PLAYGROUND_EXAMPLES.find((entry) => entry.id === data.entry.id)
      ?.compatibility,
  );
  const tabs = $derived([
    { label: "Svelte", code: data.svelteSource },
    { label: "Builder (TS)", code: data.specSource },
    { label: "Spec (JSON)", code: JSON.stringify(data.spec, null, 2) },
  ]);
</script>

<article class="example-page">
  <header class="example-prose example-heading">
    <p class="crumbs">
      <a href={`${base}/examples`}>Gallery</a> / {data.entry.docsSection}
    </p>
    <p class="eyebrow">{data.entry.category} example</p>
    <h1>{galleryEntry.featured?.jobTitle ?? data.entry.title}</h1>
    <p class="proof">
      {galleryEntry.featured?.proof ?? data.entry.description}
    </p>
  </header>

  {#if data.entry.journey}
    <section class="example-prose try-it" aria-labelledby="try-it-heading">
      <h2 id="try-it-heading">Try the interaction</h2>
      <dl>
        <div>
          <dt>Pointer</dt>
          <dd>{data.entry.journey.pointer}</dd>
        </div>
        <div>
          <dt>Keyboard</dt>
          <dd>{data.entry.journey.keyboard}</dd>
        </div>
        <div>
          <dt>Touch</dt>
          <dd>{data.entry.journey.touch}</dd>
        </div>
      </dl>
    </section>
  {/if}

  <div
    class="gg-example-frame"
    class:full-width={data.entry.journey?.fullWidth}
    style={`--example-vr-width:${String(frameWidth)}px;--example-vr-height:${String(frameHeight)}px`}
  >
    <Example />
  </div>

  <section
    class="example-prose code-section"
    aria-labelledby="example-code-heading"
  >
    <div class="section-heading">
      <div>
        <p class="eyebrow">Complete source</p>
        <h2 id="example-code-heading">Start with the Svelte component</h2>
      </div>
      {#if playgroundCompatibility?.supported}
        <a
          class="playground-link"
          href={`${base}/playground${playgroundCompatibility.fragment}`}
          >Open this example in Playground</a
        >
      {/if}
    </div>
    {#if playgroundCompatibility?.supported}
      <p class="handoff-note">
        Opens the exact bounded PortableSpec locally. Nothing is uploaded or
        executed as code.
      </p>
    {:else if playgroundCompatibility !== undefined}
      <p class="handoff-note unsupported">
        Playground handoff unavailable: {playgroundCompatibility.reason}
      </p>
    {/if}
    <CodeTabs {tabs} />
  </section>

  <section
    class="example-prose implementation"
    aria-labelledby="implementation-heading"
  >
    <div>
      <p class="eyebrow">Implementation notes</p>
      <h2 id="implementation-heading">What this example exercises</h2>
    </div>
    <dl>
      <div>
        <dt>Family</dt>
        <dd>{data.entry.docsSection}</dd>
      </div>
      <div>
        <dt>Source</dt>
        <dd><code>{data.entry.id}</code></dd>
      </div>
      <div>
        <dt>Rendering</dt>
        <dd>
          {data.entry.tags.includes("canvas")
            ? "Canvas marks with SVG chrome"
            : "SVG"}
        </dd>
      </div>
      <div>
        <dt>Techniques</dt>
        <dd><p class="tags">{data.entry.tags.join(" · ")}</p></dd>
      </div>
    </dl>
    {#if data.entry.journey}
      <nav class="references" aria-label="Related interaction reference">
        <span>Reference:</span>
        {#each data.entry.journey.references as reference, index (reference.href)}
          {#if index > 0}<span aria-hidden="true"> · </span>{/if}
          <a href={`${base}${reference.href}`}>{reference.label}</a>
        {/each}
      </nav>
    {/if}
  </section>

  <section class="example-prose related" aria-labelledby="related-heading">
    <div class="section-heading">
      <div>
        <p class="eyebrow">Keep looking</p>
        <h2 id="related-heading">Related examples</h2>
      </div>
      <a href={`${base}/examples`}>Back to all {EXAMPLES.length}</a>
    </div>
    <ul>
      {#each related as entry (entry.id)}
        <li>
          <a href={`${base}/examples/${entry.id}`}>
            <div class="preview-paper">
              <img
                src={`${base}${entry.previewPath}`}
                alt=""
                width="640"
                height={entry.vrHeight ?? 400}
                loading="lazy"
              />
            </div>
            <strong>{entry.featured?.jobTitle ?? entry.title}</strong>
          </a>
        </li>
      {/each}
    </ul>
  </section>
</article>

<style>
  .example-page {
    padding-block: clamp(2rem, 6vw, 5rem);
  }

  .example-prose {
    max-width: 68rem;
  }

  .example-heading {
    max-width: 52rem;
  }

  .crumbs,
  .eyebrow {
    color: var(--muted);
    font-size: 0.78rem;
  }

  .eyebrow {
    margin: 0;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h1 {
    max-width: 13ch;
    margin: 0.25rem 0 1rem;
    font-size: clamp(3rem, 7vw, 6.5rem);
    line-height: 0.88;
  }

  .proof {
    max-width: 45rem;
    color: var(--muted);
    font-size: 1.1rem;
  }

  .gg-example-frame {
    margin: 2.5rem 0;
    width: 100%;
    max-width: var(--example-vr-width);
    min-width: 0;
  }

  .gg-example-frame.full-width {
    max-width: none;
  }

  .try-it {
    margin-top: 2rem;
    padding-block: 1rem;
    border-block: 1px solid var(--line);
  }

  .try-it h2 {
    margin: 0 0 0.75rem;
    font-size: 1.15rem;
  }

  .try-it dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin: 0;
  }

  .try-it dt {
    font-weight: 600;
  }

  .try-it dd {
    margin: 0.25rem 0 0;
    color: var(--muted);
  }

  .code-section,
  .implementation,
  .related {
    margin-top: clamp(4rem, 8vw, 7rem);
  }

  .section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--line);
  }

  .section-heading h2,
  .implementation h2 {
    margin: 0.25rem 0 0;
  }

  .playground-link {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--ink);
    border-radius: 4px;
    color: var(--ink);
    font-weight: 600;
    text-decoration: none;
  }

  .handoff-note {
    color: var(--muted);
    font-size: 0.85rem;
  }

  .handoff-note.unsupported {
    border-left: 3px solid var(--line);
    padding-left: 0.75rem;
  }

  .implementation {
    display: grid;
    grid-template-columns: minmax(14rem, 0.6fr) minmax(0, 1.4fr);
    gap: 2rem;
    padding-block: 2rem;
    border-block: 1px solid var(--line);
  }

  .implementation dl {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
    margin: 0;
  }

  .implementation dt {
    color: var(--muted);
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .implementation dd {
    margin: 0.25rem 0 0;
  }

  .references {
    grid-column: 2;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .related ul {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin: 1.5rem 0 0;
    padding: 0;
    list-style: none;
  }

  .related a {
    display: grid;
    gap: 0.75rem;
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

  @media (max-width: 48rem) {
    .try-it dl,
    .implementation,
    .implementation dl,
    .related ul {
      grid-template-columns: 1fr;
    }

    .references {
      grid-column: 1;
    }

    .section-heading {
      align-items: start;
      flex-direction: column;
    }
  }
</style>
