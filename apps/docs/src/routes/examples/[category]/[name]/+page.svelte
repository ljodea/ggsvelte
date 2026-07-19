<script lang="ts">
  import { base } from "$app/paths";

  import CodeTabs from "$lib/CodeTabs.svelte";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();

  const Example = $derived(data.component);
  const frameWidth = 640;
  const frameHeight = $derived(data.entry.vrHeight ?? 400);
  const tabs = $derived(
    data.entry.journey?.svelteFirst
      ? [
          { label: "Svelte", code: data.svelteSource },
          { label: "Spec (JSON)", code: JSON.stringify(data.spec, null, 2) },
          { label: "Builder (TS)", code: data.specSource },
        ]
      : [
          { label: "Spec (JSON)", code: JSON.stringify(data.spec, null, 2) },
          { label: "Builder (TS)", code: data.specSource },
          { label: "Svelte", code: data.svelteSource },
        ],
  );
</script>

<article class="example-page">
  <!-- .example-prose is hidden in VR mode; the frame is what gets shot. -->
  <div class="example-prose">
    <p class="crumbs">
      <a href={`${base}/examples`}>Examples</a> / {data.entry.docsSection}
    </p>
    <h1>{data.entry.title}</h1>
    <p>{data.entry.description}</p>
    {#if data.entry.journey}
      <section class="try-it" aria-labelledby="try-it-heading">
        <h2 id="try-it-heading">Try it</h2>
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
  </div>

  <div
    class="gg-example-frame"
    class:full-width={data.entry.journey?.fullWidth}
    style={`--example-vr-width:${String(frameWidth)}px;--example-vr-height:${String(frameHeight)}px`}
  >
    <Example />
  </div>

  <div class="example-prose">
    <CodeTabs {tabs} />
    <p class="tags">
      {#each data.entry.tags as tag (tag)}<span class="tag">{tag}</span>{/each}
    </p>
    {#if data.entry.journey}
      <nav class="references" aria-label="Related interaction reference">
        <span>Related:</span>
        {#each data.entry.journey.references as reference, index (reference.href)}
          {#if index > 0}<span aria-hidden="true"> · </span>{/if}
          <a href={`${base}${reference.href}`}>{reference.label}</a>
        {/each}
      </nav>
    {/if}
  </div>
</article>

<style>
  .crumbs {
    font-size: 0.85rem;
    color: var(--muted);
  }

  .gg-example-frame {
    margin: 1.5rem 0;
    width: 100%;
    max-width: var(--example-vr-width);
    min-width: 0;
  }

  .gg-example-frame.full-width {
    max-width: none;
  }

  .try-it {
    margin-top: 1.5rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    background: var(--surface);
  }

  .try-it h2 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }

  .try-it dl {
    display: grid;
    gap: 0.65rem;
    margin: 0;
  }

  .try-it dl > div {
    display: grid;
    grid-template-columns: 5.25rem 1fr;
    gap: 0.75rem;
  }

  .try-it dt {
    font-weight: 650;
  }

  .try-it dd {
    margin: 0;
  }

  .references {
    margin: 1rem 0 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .references > span:first-child {
    margin-right: 0.35rem;
    font-weight: 650;
    color: var(--fg);
  }

  @media (max-width: 35rem) {
    .try-it dl > div {
      grid-template-columns: 1fr;
      gap: 0.1rem;
    }
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .tag {
    font-size: 0.75rem;
    padding: 0.1rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
  }
</style>
