<script lang="ts">
  import { base } from "$app/paths";

  import ReferenceLede from "$lib/components/ReferenceLede.svelte";
  import { EXAMPLES } from "$lib/examples-manifest";
  import { illustrationForGeom } from "$lib/geom-thumbnails";
  import {
    buildGeomJsonSnippet,
    buildGeomSvelteSnippet,
  } from "$lib/reference-snippets";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
  const entry = $derived(data.entry);

  const illustration = $derived.by(() => {
    const resolved = illustrationForGeom(entry.name);
    if (resolved === undefined) return undefined;
    const example = EXAMPLES.find((ex) => ex.id === resolved.exampleId);
    return {
      path: resolved.path,
      exampleId: resolved.exampleId,
      title: example?.title ?? entry.component,
      width: example?.vrWidth ?? 640,
      height: example?.vrHeight ?? 400,
    };
  });

  const svelteSnippet = $derived(
    buildGeomSvelteSnippet(
      entry.component,
      entry.name,
      entry.defaultStat,
      entry.params,
    ),
  );
  const jsonSnippet = $derived(
    buildGeomJsonSnippet(entry.name, entry.defaultStat, entry.params),
  );
</script>

<article class="geom-detail prose" aria-labelledby="geom-heading">
  <h1 id="geom-heading"><code>{entry.component}</code></h1>
  <ReferenceLede text={entry.summary} />

  {#if illustration !== undefined}
    <figure class="geom-illustration">
      <div class="preview-paper">
        <img
          src={`${base}${illustration.path}`}
          alt={`Light-theme example chart for ${entry.component}`}
          width={illustration.width}
          height={illustration.height}
          loading="eager"
          decoding="async"
        />
      </div>
      <figcaption>
        <a href={`${base}/examples/${illustration.exampleId}`}
          >{illustration.title}</a
        >
      </figcaption>
    </figure>
  {/if}

  <h2 id="defaults">Defaults</h2>
  <dl class="defaults">
    <div>
      <dt>geom</dt>
      <dd><code>{entry.name}</code></dd>
    </div>
    <div>
      <dt>default stat</dt>
      <dd><code>{entry.defaultStat}</code></dd>
    </div>
    <div>
      <dt>default position</dt>
      <dd><code>{entry.defaultPosition}</code></dd>
    </div>
    <div>
      <dt>params type</dt>
      <dd><code>{entry.paramsType}</code></dd>
    </div>
  </dl>

  {#if entry.aliasOf !== undefined}
    <h2 id="alias">Alias</h2>
    <p>
      <code>normalize()</code> rewrites this geom to
      <a href={`${base}/reference/geoms/${entry.aliasOf}`}
        ><code>{entry.aliasOf}</code></a
      >
      (with this alias's default stat and position). Prefer the canonical geom in
      new code.
    </p>
  {/if}

  <h2 id="svelte">Svelte component</h2>
  <pre class="snippet"><code>{svelteSnippet}</code></pre>

  <h2 id="json">JSON layer</h2>
  <pre class="snippet"><code>{jsonSnippet}</code></pre>

  <h2 id="params">Params</h2>
  {#if entry.params.length === 0}
    <p>This geom has no layer params (empty params object).</p>
  {:else}
    <dl class="param-list">
      {#each entry.params as param (param.name)}
        <div>
          <dt id={`param-${param.name}`}>
            <code>{param.name}</code>
            {#if param.required}
              <span class="badge">required</span>
            {/if}
          </dt>
          <dd>
            <p class="type"><code>{param.typeSummary}</code></p>
            <p>{param.description}</p>
          </dd>
        </div>
      {/each}
    </dl>
  {/if}

  <h2 id="allowed-stats">Allowed stats</h2>
  <ul class="token-list">
    {#each entry.allowedStats as stat (stat)}
      <li>
        <a href={`${base}/reference/stats/${stat}`}><code>{stat}</code></a>
        {#if stat === entry.defaultStat}
          <span class="badge">default</span>
        {/if}
      </li>
    {/each}
  </ul>

  <h2 id="allowed-positions">Allowed positions</h2>
  <ul class="token-list">
    {#each entry.allowedPositions as position (position)}
      <li>
        <a href={`${base}/reference/positions/${position}`}
          ><code>{position}</code></a
        >
        {#if position === entry.defaultPosition}
          <span class="badge">default</span>
        {/if}
      </li>
    {/each}
  </ul>

  {#if data.examples.length > 0}
    <h2 id="examples">Examples</h2>
    <ul class="example-list">
      {#each data.examples as example (example.id)}
        <li>
          <a href={`${base}${example.href}`}>{example.title}</a>
        </li>
      {/each}
    </ul>
  {/if}

  <p class="back">
    <a href={`${base}/reference/geoms`}>← All geoms</a>
    ·
    <a href={`${base}/guide/getting-started`}>Getting started</a>
  </p>
</article>

<style>
  .geom-detail {
    max-width: 52rem;
    margin: 2rem 0 4rem;
  }

  h1 {
    margin: 0 0 0.5rem;
  }

  .geom-illustration {
    margin: 0 0 1.75rem;
    max-width: 40rem;
  }

  .preview-paper {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 0.55rem;
    background: color-mix(in srgb, var(--ink) 3%, transparent);
  }

  .preview-paper img {
    display: block;
    width: 100%;
    height: auto;
  }

  .geom-illustration figcaption {
    margin-top: 0.55rem;
    color: var(--muted);
    font-size: 0.88rem;
  }

  .geom-illustration figcaption a {
    color: inherit;
    text-underline-offset: 0.12em;
  }

  .defaults {
    margin: 0;
  }

  .defaults > div {
    display: grid;
    grid-template-columns: minmax(8rem, 0.3fr) minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.55rem 0;
    border-top: 1px solid var(--line);
  }

  .defaults > div:last-child {
    border-bottom: 1px solid var(--line);
  }

  .defaults dt {
    color: var(--muted);
    font-weight: 600;
  }

  .defaults dd {
    margin: 0;
  }

  .snippet {
    overflow-x: auto;
    padding: 1rem 1.1rem;
    border-radius: 0.5rem;
    background: var(--code-bg, #1a1b26);
    color: var(--code-fg, #c0caf5);
    font-size: 0.88rem;
    line-height: 1.45;
  }

  .param-list {
    margin: 1rem 0 0;
  }

  .param-list > div {
    display: grid;
    grid-template-columns: minmax(8rem, 0.28fr) minmax(0, 1fr);
    gap: 1rem;
    padding: 0.85rem 0;
    border-top: 1px solid var(--line);
  }

  .param-list > div:last-child {
    border-bottom: 1px solid var(--line);
  }

  .param-list dt {
    font-weight: 600;
  }

  .param-list dd {
    margin: 0;
  }

  .param-list .type {
    margin: 0 0 0.35rem;
    color: var(--muted);
    font-size: 0.88rem;
  }

  .param-list p {
    margin: 0;
  }

  .badge {
    display: inline-block;
    margin-left: 0.35rem;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--ink) 8%, transparent);
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    vertical-align: middle;
  }

  .token-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    margin: 0.75rem 0 0;
    padding: 0;
    list-style: none;
  }

  .example-list {
    margin: 0.75rem 0 0;
    padding-left: 1.2rem;
  }

  .back {
    margin-top: 2.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
    color: var(--muted);
  }
</style>
