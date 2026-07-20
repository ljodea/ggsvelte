<script lang="ts">
  import { base } from "$app/paths";

  import { INTERACTION_REFERENCE_INDEX } from "$scripts/gen-llms";

  let query = $state("");
  const normalizedQuery = $derived(query.trim().toLocaleLowerCase());
  const results = $derived(
    normalizedQuery === ""
      ? INTERACTION_REFERENCE_INDEX
      : INTERACTION_REFERENCE_INDEX.filter((entry) =>
          [entry.name, entry.summary, ...entry.keywords]
            .join(" ")
            .toLocaleLowerCase()
            .includes(normalizedQuery),
        ),
  );
</script>

<main class="reference-search" aria-labelledby="reference-heading">
  <p class="eyebrow">v0.1 chart-local API</p>
  <h1 id="reference-heading">Search interaction reference</h1>
  <p class="intro">
    Find the exact opt-in prop, callback, event phase, diagnostic, or keyboard
    behavior. The linked-chart controller is planned for R1 and is not part of
    this reference.
  </p>

  <label for="interaction-search">Search capabilities and events</label>
  <input
    id="interaction-search"
    type="search"
    bind:value={query}
    placeholder="Try tooltip, brush, diagnostic, or keyboard"
    autocomplete="off"
  />

  <p class="count" aria-live="polite">
    {results.length}
    {results.length === 1 ? "result" : "results"}
  </p>

  {#if results.length === 0}
    <p class="empty">
      No exact match. Try a capability, callback, or input method.
    </p>
  {:else}
    <ul class="results">
      {#each results as entry (entry.id)}
        <li>
          <a href={`${base}${entry.href}`}>
            <strong>{entry.name}</strong>
            <span>{entry.summary}</span>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  .reference-search {
    max-width: 52rem;
    margin: 2rem 0 4rem;
  }

  h1 {
    margin: 0.15rem 0 0.6rem;
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
    margin-top: 1.5rem;
    font-weight: 650;
  }

  input {
    width: min(100%, 40rem);
    min-height: 44px;
    margin-top: 0.4rem;
    border: 1px solid var(--border);
    border-radius: 0.45rem;
    background: var(--surface);
    color: inherit;
    padding: 0.65rem 0.75rem;
    font: inherit;
  }

  input:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent) 45%, transparent);
    outline-offset: 2px;
  }

  .count {
    color: var(--muted);
  }

  .results {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    padding: 0;
    list-style: none;
  }

  .results a {
    display: grid;
    gap: 0.3rem;
    height: 100%;
    border: 1px solid var(--border);
    border-radius: 0.55rem;
    padding: 0.9rem;
    color: inherit;
    text-decoration: none;
  }

  .results a:hover {
    border-color: var(--accent);
  }

  .results span,
  .empty {
    color: var(--muted);
  }

  @media (max-width: 38rem) {
    .results {
      grid-template-columns: 1fr;
    }
  }
</style>
