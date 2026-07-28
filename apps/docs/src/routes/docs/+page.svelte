<script lang="ts">
  import { base } from "$app/paths";

  import { DOCS_TASKS } from "$lib/catalog/docs-tasks";
  import { GUIDE_CATALOG } from "$lib/catalog/guide";
  import { GUIDE_NAVIGATION } from "$lib/routes";

  const linkLabels: Record<string, string> = {
    "/guide/themes-color": "Themes and color",
    "/guide/server-rendering-export": "Server rendering and export",
  };

  // Diagnostics stays in All guides and search, not Start here.
  const tasks = DOCS_TASKS.filter((task) => task.label !== "Diagnostics");

  const descriptionByPath = new Map<string, string>([
    ...GUIDE_CATALOG.map(
      (entry) => [`/guide/${entry.slug}`, entry.description] as const,
    ),
    ["/reference", "API surfaces, geoms, interaction props, and the CLI."],
    [
      "/reference/geoms",
      "Every Geom* component: defaults, stats, positions, and params.",
    ],
    [
      "/reference/stats",
      "Every statistical transform: after_stat columns and compatible geoms.",
    ],
    [
      "/reference/positions",
      "Every position adjustment: stack, dodge, jitter params, and geoms.",
    ],
    [
      "/reference/cli",
      "Render, validate, and export charts from the terminal.",
    ],
    [
      "/reference/interactions",
      "Search interaction props, callbacks, event phases, and diagnostic codes.",
    ],
  ]);

  // Distinct from sidebar `guide-*` ids so both can sit on this page.
  function landingSectionId(section: string): string {
    return `docs-landing-${section
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "")}`;
  }

  // Overview is this page; Getting started is already in Start here.
  const chapters = GUIDE_NAVIGATION.map((group) => ({
    section: group.section,
    entries: group.entries.filter(
      (entry) =>
        entry.path !== "/docs" && entry.path !== "/guide/getting-started",
    ),
  })).filter((group) => group.entries.length > 0);
</script>

<article class="docs-landing" aria-labelledby="docs-heading">
  <h1 id="docs-heading">Documentation</h1>

  <nav class="docs-tasks" aria-label="Documentation tasks">
    <h2 id="docs-tasks-heading">Start here</h2>
    {#each tasks as task (task.label)}
      <section class="task">
        <a class="task-primary" href={`${base}${task.hrefs[0]}`}>
          <strong>{task.label}</strong>
          <span>{task.description}</span>
        </a>
        {#if task.hrefs.length > 1}
          <p class="task-also">
            Also:
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

  <nav class="docs-chapters" aria-label="All documentation guides">
    <h2 id="docs-chapters-heading">All guides</h2>
    {#each chapters as group (group.section)}
      <section
        class="chapter-group"
        aria-labelledby={landingSectionId(group.section)}
      >
        <h3 id={landingSectionId(group.section)}>{group.section}</h3>
        <ul>
          {#each group.entries as entry (entry.path)}
            <li>
              <a href={`${base}${entry.path}`}>
                <strong>{entry.label}</strong>
                {#if descriptionByPath.get(entry.path)}
                  <span>{descriptionByPath.get(entry.path)}</span>
                {/if}
              </a>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </nav>

  <section class="docs-next" aria-labelledby="docs-next-heading">
    <h2 id="docs-next-heading">Also</h2>
    <p>
      <a href={`${base}/examples`}>Examples</a>
      ·
      <a href={`${base}/reference`}>Reference</a>
      ·
      <a href={`${base}/themes`}>Themes</a>
      ·
      <a href={`${base}/palettes`}>Palettes</a>
      ·
      <a href={`${base}/interactions`}>Interactions</a>
    </p>
  </section>
</article>

<style>
  /*
   * One border between content regions (Start here / All guides / Also).
   * No divider under the bare title — that read as intro chrome.
   */
  .docs-landing > * + * {
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid var(--line);
  }

  .docs-landing > h1 + * {
    margin-top: 2rem;
    padding-top: 0;
    border-top: none;
  }

  h1 {
    max-width: 13ch;
    margin: 0;
    font-size: clamp(2.7rem, 7vw, 5.75rem);
    line-height: 0.94;
    letter-spacing: -0.035em;
  }

  h2 {
    margin: 0 0 1rem;
    font-family: var(--display-font);
    font-size: 1.35rem;
    letter-spacing: -0.02em;
  }

  h3 {
    margin: 0 0 0.65rem;
    font-family: var(--display-font);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .docs-tasks .task + .task {
    border-top: 1px solid var(--line);
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

  .task-primary strong,
  .docs-chapters a strong {
    font-family: var(--display-font);
    font-size: 1.1rem;
  }

  .task-primary span,
  .task-also,
  .docs-chapters a span {
    color: var(--muted);
  }

  .task-also {
    margin: -0.75rem 0 1rem 42%;
    font-size: 0.82rem;
  }

  .chapter-group + .chapter-group {
    margin-top: 1.75rem;
  }

  .docs-chapters ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .docs-chapters li + li {
    border-top: 1px solid color-mix(in srgb, var(--line) 70%, transparent);
  }

  .docs-chapters a {
    display: grid;
    grid-template-columns: minmax(10rem, 0.42fr) minmax(0, 1fr);
    align-items: baseline;
    gap: 1rem;
    padding: 0.7rem 0;
    color: var(--ink);
    text-decoration: none;
  }

  .docs-chapters a:hover strong {
    text-decoration: underline;
  }

  .docs-chapters a span {
    font-size: 0.95rem;
    line-height: 1.4;
  }

  .docs-next h2 {
    margin-top: 0;
  }

  .docs-next p {
    margin: 0;
  }

  @media (max-width: 40rem) {
    .task-primary,
    .docs-chapters a {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }

    .task-primary {
      min-height: 0;
      padding: 0.85rem 0;
    }

    .task-also {
      margin-left: 0;
    }
  }
</style>
