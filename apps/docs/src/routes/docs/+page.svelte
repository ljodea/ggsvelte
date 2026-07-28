<script lang="ts">
  import { base } from "$app/paths";

  import {
    GUIDE_CATALOG,
    guideNavBlocks,
    guideSectionDomId,
  } from "$lib/catalog/guide";
  import { GUIDE_NAVIGATION } from "$lib/routes";

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

  // Overview is this page — do not list it again under the chapter map.
  const chapters = GUIDE_NAVIGATION.map((group) => ({
    section: group.section,
    entries: group.entries.filter((entry) => entry.path !== "/docs"),
  })).filter((group) => group.entries.length > 0);

  // Decorative labels (Start, Core grammar, …) are dropped; only Reference stays.
  const blocks = guideNavBlocks(chapters);
</script>

<article class="docs-landing" aria-labelledby="docs-heading">
  <h1 id="docs-heading">Documentation</h1>

  <nav class="docs-chapters" aria-label="Documentation guides">
    {#each blocks as block (block.kind === "section" ? block.section : block.key)}
      {#if block.kind === "section"}
        <section
          class="chapter-group"
          aria-labelledby={guideSectionDomId(`docs-landing-${block.section}`)}
        >
          <h2 id={guideSectionDomId(`docs-landing-${block.section}`)}>
            {block.section}
          </h2>
          <ul>
            {#each block.entries as entry (entry.path)}
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
      {:else}
        <ul class="chapter-flat">
          {#each block.entries as entry (entry.path)}
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
      {/if}
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
   * One border between content regions (guides / Also).
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
    margin: 0 0 0.65rem;
    font-family: var(--display-font);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .docs-next h2 {
    margin: 0 0 1rem;
    font-size: 1.35rem;
    letter-spacing: -0.02em;
    text-transform: none;
    font-weight: inherit;
    color: inherit;
  }

  .chapter-group + .chapter-group,
  .chapter-flat + .chapter-group,
  .chapter-group + .chapter-flat,
  .chapter-flat + .chapter-flat {
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

  .docs-chapters a strong {
    font-family: var(--display-font);
    font-size: 1.1rem;
  }

  .docs-chapters a span {
    color: var(--muted);
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
    .docs-chapters a {
      grid-template-columns: 1fr;
      gap: 0.3rem;
    }
  }
</style>
