<script lang="ts">
  import { base } from "$app/paths";
</script>

<article class="reference-landing" aria-labelledby="reference-heading">
  <header>
    <h1 id="reference-heading">Reference</h1>
    <p>
      Public contracts for interactions, CLI, diagnostics, lifecycle, and
      schema.
    </p>
  </header>

  <nav aria-label="Reference sections">
    <a href={`${base}/reference/interactions`}>
      <strong>Interaction reference</strong>
      <span>Capabilities, events, diagnostics, accessibility defaults.</span>
    </a>
    <a href={`${base}/reference/cli`}>
      <strong>CLI reference</strong>
      <span>Flags, streams, diagnostics, exit classes.</span>
    </a>
    <a href={`${base}/guide/errors`}>
      <strong>Errors reference</strong>
      <span>Validation, pipeline, interaction, and CLI diagnostics.</span>
    </a>
    <a href={`${base}/guide/advisories`}>
      <strong>Advisories</strong>
      <span>Valid-but-questionable specs and disclosed heuristics.</span>
    </a>
    <a href={`${base}/guide/lifecycle`}>
      <strong>Lifecycle and editions</strong>
      <span>Stability tags and defaults-edition behavior.</span>
    </a>
    <a href={`${base}/schema/v0.json`}>
      <strong>PortableSpec JSON Schema</strong>
      <span>Machine-readable constrained specification.</span>
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
