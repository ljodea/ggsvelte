<script lang="ts">
  import { base } from "$app/paths";

  import type { ExampleManifestEntry } from "$lib/examples";
  import { EXAMPLES } from "$lib/examples";

  // Group by docsSection, preserving manifest (stable) order within groups
  // and first-appearance order of the sections themselves.
  const sections: { section: string; entries: ExampleManifestEntry[] }[] = [];
  for (const entry of EXAMPLES) {
    const bucket = sections.find((s) => s.section === entry.docsSection);
    if (bucket === undefined) {
      sections.push({ section: entry.docsSection, entries: [entry] });
    } else {
      bucket.entries.push(entry);
    }
  }
</script>

<h1>Examples</h1>
<p>
  Every example is one source with three uses: this gallery, the visual
  regression baseline matrix (light + dark), and the agent-facing
  <code>llms-full.txt</code>.
</p>

{#each sections as { section, entries } (section)}
  <section>
    <h2>{section}</h2>
    <ul class="cards">
      {#each entries as entry (entry.id)}
        <li>
          <a href={`${base}/examples/${entry.id}`}>
            <h3>{entry.title}</h3>
            <p>{entry.description}</p>
            <p class="tags">
              {#each entry.tags as tag (tag)}<span class="tag">{tag}</span
                >{/each}
            </p>
          </a>
        </li>
      {/each}
    </ul>
  </section>
{/each}

<style>
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
    gap: 1rem;
  }

  .cards a {
    display: block;
    height: 100%;
    padding: 1rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    color: inherit;
    text-decoration: none;
  }

  .cards a:hover {
    border-color: var(--accent);
  }

  .cards h3 {
    margin: 0 0 0.35rem;
    font-size: 1rem;
    color: var(--accent);
  }

  .cards p {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .tag {
    font-size: 0.7rem;
    padding: 0.05rem 0.45rem;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
  }
</style>
