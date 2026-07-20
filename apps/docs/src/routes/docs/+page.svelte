<script lang="ts">
  import { base } from "$app/paths";

  import { DOCS_TASKS } from "$lib/catalog/docs-tasks";

  const linkLabels: Record<string, string> = {
    "/guide/themes-color": "Themes and color",
    "/guide/server-rendering-export": "Server rendering and export",
  };
</script>

<article class="docs-landing" aria-labelledby="docs-heading">
  <header>
    <h1 id="docs-heading">Build a chart, then follow the job.</h1>
    <p>
      Start with one complete Svelte file. Continue through focused chapters
      when you need to customize, add interaction, deploy, or recover from a
      diagnostic.
    </p>
  </header>

  <nav aria-label="Documentation tasks">
    {#each DOCS_TASKS as task (task.label)}
      <section>
        <a class="task-primary" href={`${base}${task.hrefs[0]}`}>
          <strong>{task.label}</strong>
          <span>{task.description}</span>
        </a>
        {#if task.hrefs.length > 1}
          <p>
            Then:
            {#each task.hrefs.slice(1) as href, index (href)}
              {#if index > 0}
                ·
              {/if}<a href={`${base}${href}`}>{linkLabels[href] ?? href}</a>
            {/each}
          </p>
        {/if}
      </section>
    {/each}
  </nav>

  <section class="docs-next" aria-labelledby="docs-next-heading">
    <h2 id="docs-next-heading">Go deeper without losing the path.</h2>
    <p>
      <a href={`${base}/examples`}>Browse real rendered examples</a>, or open
      the
      <a href={`${base}/reference`}>single Reference hierarchy</a> for exact public
      contracts.
    </p>
  </section>
</article>

<style>
  .docs-landing header {
    padding-bottom: 2rem;
    border-bottom: 1px solid var(--line);
  }

  h1 {
    max-width: 13ch;
    margin: 0;
    font-size: clamp(2.7rem, 7vw, 5.75rem);
    line-height: 0.94;
    letter-spacing: -0.035em;
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
    border-top: 1px solid var(--line);
  }

  nav section {
    border-bottom: 1px solid var(--line);
  }

  .task-primary {
    display: grid;
    grid-template-columns: minmax(10rem, 0.42fr) minmax(0, 1fr);
    min-height: 5.5rem;
    align-items: center;
    padding: 1rem 0;
    color: var(--ink);
    text-decoration: none;
    gap: 1rem;
  }

  .task-primary:hover strong {
    text-decoration: underline;
  }

  .task-primary strong {
    font-family: var(--display-font);
    font-size: 1.1rem;
  }

  .task-primary span,
  nav p {
    color: var(--muted);
  }

  nav p {
    margin: -0.75rem 0 1rem 42%;
    font-size: 0.82rem;
  }

  .docs-next {
    margin-top: 3rem;
    padding-top: 2rem;
    border-top: 1px solid var(--line);
  }

  .docs-next h2 {
    margin-top: 0;
  }

  @media (max-width: 40rem) {
    .task-primary {
      grid-template-columns: 1fr;
      gap: 0.35rem;
    }

    nav p {
      margin-left: 0;
    }
  }
</style>
