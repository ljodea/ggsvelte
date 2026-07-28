<script lang="ts">
  import { base } from "$app/paths";
  import { componentNameForGeom } from "@ggsvelte/spec";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
  const entry = $derived(data.entry);

  const primaryGeom = $derived(
    entry.defaultForGeoms[0] ?? entry.compatibleGeoms[0],
  );
  const primaryComponent = $derived(
    primaryGeom === undefined ? "GeomBar" : componentNameForGeom(primaryGeom),
  );

  const paramPropLines = $derived(
    entry.params.length === 0
      ? ""
      : "\n" +
          entry.params
            .slice(0, 2)
            .map((p) => `  ${p.name}={/* … */}`)
            .join("\n") +
          "\n",
  );

  const svelteSnippet = $derived(
    entry.params.length === 0
      ? `import { GGPlot, ${primaryComponent} } from "@ggsvelte/svelte";\n\n<GGPlot data={rows} aes={{ x: "x", y: "y" }}>\n  <${primaryComponent} position="${entry.name}" />\n</GGPlot>`
      : `import { GGPlot, ${primaryComponent} } from "@ggsvelte/svelte";\n\n<GGPlot data={rows} aes={{ x: "x", y: "y" }}>\n  <${primaryComponent}\n    position="${entry.name}"\n    positionParams={{${paramPropLines === "" ? "" : " /* see params */ "}}}\n  />\n</GGPlot>`,
  );

  const jsonSnippet = $derived(
    entry.params.length === 0
      ? `{\n  "geom": "${primaryGeom ?? "bar"}",\n  "position": "${entry.name}"\n}`
      : `{\n  "geom": "${primaryGeom ?? "point"}",\n  "position": "${entry.name}",\n  "positionParams": { ${entry.params
          .slice(0, 2)
          .map((p) => `"${p.name}": /* … */`)
          .join(", ")} }\n}`,
  );
</script>

<article class="position-detail prose" aria-labelledby="position-heading">
  <p class="crumb">
    <a href={`${base}/reference/positions`}>Position reference</a>
    <span aria-hidden="true">/</span>
    <code>{entry.name}</code>
  </p>

  <h1 id="position-heading"><code>position: "{entry.name}"</code></h1>
  <p class="lede">{entry.summary}</p>

  <h2 id="usage">Usage</h2>
  <p>
    Positions are not components. Pass <code>position="{entry.name}"</code> on a
    compatible <code>&lt;Geom*&gt;</code>, or set
    <code>"position": "{entry.name}"</code> on a JSON layer.
  </p>
  <pre class="snippet"><code>{svelteSnippet}</code></pre>
  <pre class="snippet"><code>{jsonSnippet}</code></pre>

  <h2 id="params">positionParams</h2>
  {#if entry.params.length === 0}
    <p>
      This position has no <code>positionParams</code>. Only jitter (width,
      height, seed) and nudge (x, y) accept parameters.
    </p>
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

  <h2 id="default-for">Default for geoms</h2>
  {#if entry.defaultForGeoms.length === 0}
    <p>
      No geom uses this as its default position. Set it explicitly when needed.
    </p>
  {:else}
    <ul class="token-list">
      {#each entry.defaultForGeoms as geom (geom)}
        <li>
          <a href={`${base}/reference/geoms/${geom}`}
            ><code>{componentNameForGeom(geom)}</code></a
          >
        </li>
      {/each}
    </ul>
  {/if}

  <h2 id="compatible-geoms">Compatible geoms</h2>
  <ul class="token-list">
    {#each entry.compatibleGeoms as geom (geom)}
      <li>
        <a href={`${base}/reference/geoms/${geom}`}
          ><code>{componentNameForGeom(geom)}</code></a
        >
        {#if entry.defaultForGeoms.includes(geom)}
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
    <a href={`${base}/reference/positions`}>← All positions</a>
    ·
    <a href={`${base}/reference/geoms`}>Geom reference</a>
    ·
    <a href={`${base}/reference/stats`}>Stat reference</a>
  </p>
</article>

<style>
  .position-detail {
    max-width: 52rem;
    margin: 2rem 0 4rem;
  }

  .crumb {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0 0 0.75rem;
    color: var(--muted);
    font-size: 0.9rem;
  }

  h1 {
    margin: 0 0 0.5rem;
  }

  .lede {
    max-width: 44rem;
    margin: 0 0 1.5rem;
    font-size: 1.05rem;
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

  .snippet + .snippet {
    margin-top: 0.75rem;
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
