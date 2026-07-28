<script lang="ts">
  import { base } from "$app/paths";
  import { SHARED_LAYER_PROPS } from "@ggsvelte/spec";

  import type { PageProps } from "./$types";

  const { data }: PageProps = $props();
  const entry = $derived(data.entry);

  const svelteSnippet = $derived(
    buildSvelteSnippet(
      entry.component,
      entry.params.map((p) => p.name),
    ),
  );
  const jsonSnippet = $derived(
    buildJsonSnippet(
      entry.name,
      entry.defaultStat,
      entry.params.map((p) => p.name),
    ),
  );

  function buildSvelteSnippet(
    component: string,
    paramNames: readonly string[],
  ): string {
    const sampleParams = paramNames.slice(0, 2);
    const props =
      sampleParams.length === 0
        ? ""
        : "\n" + sampleParams.map((p) => `  ${p}={/* … */}`).join("\n") + "\n";
    return `import { GGPlot, ${component} } from "@ggsvelte/svelte";\n\n<GGPlot data={rows} aes={{ x: "x", y: "y" }}>\n  <${component}${props === "" ? " " : props}/>\n</GGPlot>`;
  }

  function buildJsonSnippet(
    geom: string,
    defaultStat: string,
    paramNames: readonly string[],
  ): string {
    const paramsObj =
      paramNames.length === 0
        ? ""
        : `,\n  "params": { ${paramNames
            .slice(0, 2)
            .map((p) => `"${p}": /* … */`)
            .join(", ")} }`;
    return `{\n  "geom": "${geom}"${defaultStat === "identity" ? "" : `,\n  "stat": "${defaultStat}"`}${paramsObj}\n}`;
  }
</script>

<article class="geom-detail prose" aria-labelledby="geom-heading">
  <p class="crumb">
    <a href={`${base}/reference/geoms`}>Geom reference</a>
    <span aria-hidden="true">/</span>
    <code>{entry.name}</code>
  </p>

  <h1 id="geom-heading"><code>{entry.component}</code></h1>
  <p class="lede">{entry.summary}</p>

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
      (with the default stat/position of this alias). Prefer the canonical geom in
      new code; the alias remains for ggplot2 familiarity.
    </p>
  {/if}

  <h2 id="svelte">Svelte component</h2>
  <p>
    Import <code>{entry.component}</code> from <code>@ggsvelte/svelte</code>.
    Constant style params are <strong>direct props</strong> (not a nested
    <code>params</code> object). Plus the
    <a href={`${base}/reference/geoms#shared-layer-props`}>shared layer props</a
    >
    (<code>{SHARED_LAYER_PROPS.map((p) => p.name).join(", ")}</code>).
  </p>
  <pre class="snippet"><code>{svelteSnippet}</code></pre>

  <h2 id="json">JSON layer</h2>
  <p>
    PortableSpec form: <code>geom</code> plus optional
    <code>stat</code>, <code>position</code>, <code>params</code>,
    <code>aes</code>, and <code>data</code>.
  </p>
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
        <code>{position}</code>
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
    <a href={`${base}/guide/layers-marks`}>Layers and marks guide</a>
  </p>
</article>

<style>
  .geom-detail {
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
