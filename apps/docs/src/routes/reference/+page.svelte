<script lang="ts">
  import { base } from "$app/paths";
</script>

<article class="reference-landing" aria-labelledby="reference-heading">
  <header>
    <h1 id="reference-heading">Reference</h1>
    <p>
      Exact public contracts, generated from the same catalogs and lifecycle
      facts as the packages.
    </p>
  </header>

  <nav aria-label="Reference sections">
    <a href={`${base}/reference/interactions`}>
      <strong>Interaction reference</strong>
      <span>Capabilities, events, diagnostics, and accessibility defaults.</span
      >
    </a>
    <a href={`${base}/reference/cli`}>
      <strong>CLI reference</strong>
      <span
        >Implementation-derived flags, streams, diagnostics, and exit classes.</span
      >
    </a>
    <a href={`${base}/guide/errors`}>
      <strong>Errors reference</strong>
      <span
        >Source-qualified validation, pipeline, interaction, and CLI
        diagnostics.</span
      >
    </a>
    <a href={`${base}/guide/advisories`}>
      <strong>Advisories</strong>
      <span
        >Valid-but-questionable specs and disclosed rendering heuristics.</span
      >
    </a>
    <a href={`${base}/guide/lifecycle`}>
      <strong>Lifecycle and editions</strong>
      <span
        >Every public export’s stability tag and defaults-edition behavior.</span
      >
    </a>
    <a href={`${base}/schema/v0.json`}>
      <strong>PortableSpec JSON Schema</strong>
      <span>The machine-readable constrained specification contract.</span>
    </a>
  </nav>
</article>

<style>
  header {
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--line);
  }

  h1 {
    margin: 0;
    font-size: clamp(3rem, 7vw, 6rem);
    line-height: 0.9;
    letter-spacing: -0.04em;
  }

  header p {
    max-width: 42rem;
    margin: 1.25rem 0 0;
    color: var(--muted);
    font-size: 1.05rem;
  }

  nav {
    display: grid;
    margin-top: 2rem;
  }

  nav a {
    display: grid;
    min-height: 5rem;
    align-content: center;
    padding: 1rem 0;
    border-bottom: 1px solid var(--line);
    color: var(--ink);
    text-decoration: none;
    gap: 0.35rem;
  }

  nav strong {
    font-family: var(--display-font);
    font-size: 1.1rem;
  }

  nav a:hover strong {
    text-decoration: underline;
  }

  nav span {
    color: var(--muted);
  }
</style>
