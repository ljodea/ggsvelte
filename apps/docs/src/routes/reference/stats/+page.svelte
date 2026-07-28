<script lang="ts">
  import { base } from "$app/paths";
  import {
    STAT_REFERENCE,
    statReferenceList,
    type StatReferenceEntry,
  } from "@ggsvelte/spec";

  let query = $state("");
  const all = statReferenceList();
  const normalizedQuery = $derived(query.trim().toLocaleLowerCase());
  const results = $derived(
    normalizedQuery === ""
      ? all
      : all.filter((entry) => matchesStat(entry, normalizedQuery)),
  );

  function matchesStat(entry: StatReferenceEntry, q: string): boolean {
    const haystack = [
      entry.name,
      entry.summary,
      ...entry.generatedColumns,
      ...entry.compatibleGeoms,
      ...entry.defaultForGeoms,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return haystack.includes(q);
  }
</script>

<main class="stat-reference" aria-labelledby="reference-heading">
  <p class="eyebrow">
    Schema-derived · {Object.keys(STAT_REFERENCE).length} stats
  </p>
  <h1 id="reference-heading">Stats</h1>
  <p class="intro">
    Statistical transforms applied before drawing. Set
    <code>stat</code> on a <code>&lt;Geom*&gt;</code> shell or JSON layer —
    there is no separate Stat component. Generated from
    <code>KNOWN_STATS</code>, <code>STAT_COLUMNS</code>, and which geoms allow
    each value in the PortableSpec schema.
  </p>

  <label for="stat-search">Search stats, columns, or geoms</label>
  <input
    id="stat-search"
    type="search"
    bind:value={query}
    placeholder="Try count, density, bin, or smooth"
    autocomplete="off"
  />

  <p class="count" aria-live="polite">
    {results.length}
    {results.length === 1 ? "stat" : "stats"}
  </p>

  <h2 id="all-stats">All stats</h2>
  {#if results.length === 0}
    <p class="empty">No match. Try a stat name, after_stat column, or geom.</p>
  {:else}
    <ul class="results">
      {#each results as entry (entry.name)}
        <li>
          <a href={`${base}/reference/stats/${entry.slug}`}>
            <strong><code>{entry.name}</code></strong>
            <span class="meta">
              {#if entry.generatedColumns.length > 0}
                after_stat: {entry.generatedColumns.join(", ")}
              {:else}
                no after_stat columns
              {/if}
              · {entry.compatibleGeoms.length}
              {entry.compatibleGeoms.length === 1 ? "geom" : "geoms"}
              {#if entry.defaultForGeoms.length > 0}
                · default for {entry.defaultForGeoms.length}
              {/if}
            </span>
            <span class="summary">{entry.summary}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}

  <h2 id="how-to-set">How to set a stat</h2>
  <p>
    On any geom shell, pass the <code>stat</code> prop. Only values listed on
    that geom's
    <a href={`${base}/reference/geoms`}>Geoms</a> page validate. Omit it to use the
    geom default.
  </p>
  <pre class="snippet"><code
      >{`import { GGPlot, GeomBar } from "@ggsvelte/svelte";

<GGPlot data={rows} aes={{ x: "category" }}>
  <GeomBar stat="count" />
</GGPlot>`}</code
    ></pre>
</main>

<style>
  .stat-reference {
    max-width: 52rem;
    margin: 2rem 0 4rem;
  }

  h1 {
    margin: 0.15rem 0 0.6rem;
  }

  h2 {
    margin: 2.5rem 0 0.75rem;
  }

  .intro {
    max-width: 44rem;
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  label {
    display: block;
    margin: 1.5rem 0 0.4rem;
    font-weight: 600;
  }

  input[type="search"] {
    width: min(100%, 28rem);
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: 0.4rem;
    background: var(--surface, transparent);
    color: var(--ink);
    font: inherit;
  }

  .count {
    margin: 0.75rem 0 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .empty {
    color: var(--muted);
  }

  .results {
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
  }

  .results li {
    border-top: 1px solid var(--line);
  }

  .results li:last-child {
    border-bottom: 1px solid var(--line);
  }

  .results a {
    display: grid;
    gap: 0.25rem;
    padding: 0.9rem 0;
    color: var(--ink);
    text-decoration: none;
  }

  .results a:hover strong {
    text-decoration: underline;
  }

  .meta {
    color: var(--muted);
    font-size: 0.88rem;
  }

  .summary {
    max-width: 44rem;
    color: var(--muted);
    font-size: 0.92rem;
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
</style>
