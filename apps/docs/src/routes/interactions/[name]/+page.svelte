<script lang="ts">
  import { base } from "$app/paths";

  import CodeTabs from "$lib/CodeTabs.svelte";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
  const Example = $derived(data.component);
  const frameWidth = $derived(data.entry.vrWidth ?? 640);
  const frameHeight = $derived(data.entry.vrHeight ?? 400);
  const tabs = $derived([
    { label: "Svelte", code: data.svelteSource, language: "svelte" },
    { label: "Builder (TS)", code: data.specSource, language: "typescript" },
    {
      label: "Spec (JSON)",
      code: JSON.stringify(data.spec, null, 2),
      language: "json",
    },
  ]);
</script>

<article class="interaction-demo-page">
  <header class="example-prose heading">
    <p class="crumbs">
      <a href={`${base}/interactions`}>Interactions</a> / {data.entry.name}
    </p>
    <p class="eyebrow">Interaction</p>
    <h1>{data.entry.title}</h1>
    {#if data.entry.description.trim() !== ""}
      <p class="lede">{data.entry.description}</p>
    {/if}
  </header>

  {#if data.entry.journey}
    <section class="example-prose try-it" aria-labelledby="try-it-heading">
      <h2 id="try-it-heading">Interaction</h2>
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
        <p class="eyebrow">Source</p>
        <h2 id="example-code-heading">Svelte, builder, JSON</h2>
      </div>
    </div>
    <CodeTabs {tabs} />
  </section>

  {#if data.entry.journey}
    <nav
      class="example-prose references"
      aria-label="Related interaction reference"
    >
      <span>Reference:</span>
      {#each data.entry.journey.references as reference, index (reference.href)}
        {#if index > 0}<span aria-hidden="true"> · </span>{/if}
        <a href={`${base}${reference.href}`}>{reference.label}</a>
      {/each}
    </nav>
  {/if}
</article>

<style>
  .interaction-demo-page {
    padding-block: clamp(2rem, 6vw, 5rem);
  }

  .example-prose {
    max-width: 68rem;
  }

  .heading {
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
    max-width: 18ch;
    margin: 0.25rem 0 1rem;
    font-size: clamp(2.5rem, 6vw, 4.5rem);
    line-height: 0.92;
  }

  .lede {
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

  .code-section {
    margin-top: clamp(3rem, 6vw, 5rem);
  }

  .section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--line);
  }

  /* CodeTabs already draws a top rule — keep one separator, not a double line. */
  .code-section .section-heading {
    padding-bottom: 0.35rem;
    border-bottom: none;
  }

  .code-section :global(.code-tabs) {
    margin-top: 0.75rem;
  }

  .section-heading h2 {
    margin: 0.25rem 0 0;
  }

  .references {
    margin-top: 2rem;
    color: var(--muted);
    font-size: 0.9rem;
  }

  @media (max-width: 48rem) {
    .try-it dl {
      grid-template-columns: 1fr;
    }
  }
</style>
