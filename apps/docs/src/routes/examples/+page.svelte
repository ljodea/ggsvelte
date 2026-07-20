<script lang="ts">
  import { base } from "$app/paths";
  import { onMount } from "svelte";

  import { FEATURED_EXAMPLES, galleryEntryFor } from "$lib/catalog/gallery";
  import {
    filterGallery,
    parseGalleryFilter,
    serializeGalleryFilter,
    type GalleryFilterState,
  } from "$lib/gallery-filter";
  import { EXAMPLES } from "$lib/examples";

  const entries = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const featured = FEATURED_EXAMPLES.map((item) =>
    entries.find((entry) => entry.id === item.id)!,
  );
  const categories = [
    ...new Set(entries.map((entry) => entry.category)),
  ].toSorted();
  const tags = [
    ...new Set(entries.flatMap((entry) => [...entry.tags])),
  ].toSorted();
  const options = { categories: new Set(categories), tags: new Set(tags) };
  let filters = $state<GalleryFilterState>({
    query: "",
    categories: [],
    tags: [],
  });
  let resetNotice = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const results = $derived(filterGallery(entries, filters));

  function readLocation(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    const parsed = parseGalleryFilter(
      new URL(location.href).searchParams,
      options,
    );
    filters = parsed.state;
    resetNotice = parsed.reset;
  }

  function commit(mode: "push" | "replace"): void {
    const url = new URL(location.href);
    url.search = serializeGalleryFilter(filters, url.searchParams).toString();
    history[mode === "push" ? "pushState" : "replaceState"]({}, "", url);
    resetNotice = false;
  }

  function updateQuery(): void {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => commit("replace"), 180);
  }

  function updateCategory(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    filters.categories = value === "" ? [] : [value];
    commit("push");
  }

  function updateTag(event: Event): void {
    const value = (event.currentTarget as HTMLSelectElement).value;
    filters.tags = value === "" ? [] : [value];
    commit("push");
  }

  function clearFilters(): void {
    filters = { query: "", categories: [], tags: [] };
    commit("push");
  }

  onMount(() => {
    addEventListener("popstate", readLocation);
    readLocation();
    if (resetNotice) {
      const url = new URL(location.href);
      url.search = serializeGalleryFilter(filters, url.searchParams).toString();
      history.replaceState(null, "", url);
    }
    return () => {
      removeEventListener("popstate", readLocation);
      if (timer !== undefined) clearTimeout(timer);
    };
  });
</script>

<svelte:head><meta name="theme-color" content="#ffffff" /></svelte:head>

<header class="gallery-intro">
  <p class="eyebrow">Gallery</p>
  <h1>Find the chart your work needs</h1>
  <p>
    Start with six common jobs, then filter the complete set of {entries.length} runnable
    examples. Every preview is generated from the same ggsvelte output used by visual
    regression tests.
  </p>
</header>

<section class="featured-gallery" aria-labelledby="featured-heading">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Six starting points</p>
      <h2 id="featured-heading">What are you trying to show?</h2>
    </div>
    <a href="#all-examples">View all {entries.length}</a>
  </div>
  <ol>
    {#each featured as entry (entry.id)}
      <li>
        <a href={`${base}/examples/${entry.id}`}>
          <figure>
            <div class="preview-paper">
              <img
                src={`${base}${entry.previewPath}`}
                alt=""
                width="640"
                height={entry.vrHeight ?? 400}
                loading="eager"
              />
            </div>
            <figcaption>
              <span class="example-kind">{entry.featured!.note}</span>
              <strong>{entry.featured!.jobTitle}</strong>
              <span>{entry.featured!.proof}</span>
            </figcaption>
          </figure>
        </a>
      </li>
    {/each}
  </ol>
</section>

<section id="all-examples" class="catalog" aria-labelledby="catalog-heading">
  <div class="section-heading">
    <div>
      <p class="eyebrow">Complete catalog</p>
      <h2 id="catalog-heading">All examples</h2>
    </div>
    <p class="result-count" aria-live="polite">
      {results.length} of {entries.length}
    </p>
  </div>

  <form class="filters" onsubmit={(event) => event.preventDefault()}>
    <label>
      <span>Filter examples</span>
      <input
        type="search"
        placeholder="Try legend, facet, canvas…"
        bind:value={filters.query}
        oninput={updateQuery}
      />
    </label>
    <label>
      <span>Chart family</span>
      <select value={filters.categories[0] ?? ""} onchange={updateCategory}>
        <option value="">All families</option>
        {#each categories as category (category)}<option value={category}
            >{category}</option
          >{/each}
      </select>
    </label>
    <label>
      <span>Technique</span>
      <select value={filters.tags[0] ?? ""} onchange={updateTag}>
        <option value="">All techniques</option>
        {#each tags as tag (tag)}<option value={tag}>{tag}</option>{/each}
      </select>
    </label>
    <button type="button" onclick={clearFilters}>Clear filters</button>
  </form>

  {#if resetNotice}
    <p class="filter-notice" aria-live="polite">
      Some unsupported filters were reset.
    </p>
  {/if}

  {#if results.length === 0}
    <div class="zero-results">
      <h3>No examples match those filters.</h3>
      <p>Try a broader phrase or clear the selected family and technique.</p>
      <button type="button" onclick={clearFilters}>Clear filters</button>
    </div>
  {:else}
    <ul class="example-grid">
      {#each results as entry (entry.id)}
        <li>
          <a href={`${base}/examples/${entry.id}`}>
            <figure>
              <div class="preview-paper">
                <img
                  src={`${base}${entry.previewPath}`}
                  alt=""
                  width="640"
                  height={entry.vrHeight ?? 400}
                  loading="lazy"
                />
              </div>
              <figcaption>
                <span class="example-kind">{entry.docsSection}</span>
                <strong>{entry.title}</strong>
                <span>{entry.description}</span>
              </figcaption>
            </figure>
          </a>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .gallery-intro {
    max-width: 48rem;
    padding: clamp(3rem, 7vw, 6rem) 0 2.5rem;
  }

  .gallery-intro h1 {
    max-width: 12ch;
    margin: 0.25rem 0 1rem;
    font-size: clamp(3rem, 8vw, 6.5rem);
    line-height: 0.88;
  }

  .gallery-intro > p:last-child {
    max-width: 42rem;
    color: var(--muted);
    font-size: 1.08rem;
  }

  .eyebrow,
  .example-kind {
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .section-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 1rem;
  }

  .section-heading :is(p, h2) {
    margin: 0;
  }

  .featured-gallery ol,
  .example-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2rem 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  figure {
    margin: 0;
  }

  .featured-gallery a,
  .example-grid a {
    color: inherit;
    text-decoration: none;
  }

  .preview-paper {
    display: grid;
    aspect-ratio: 4 / 3;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--line);
    background: #fff;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  figcaption {
    display: grid;
    gap: 0.35rem;
    padding-top: 0.75rem;
  }

  figcaption strong {
    font: 700 1.35rem/1.05 var(--display-font);
  }

  figcaption > span:last-child {
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .catalog {
    margin-top: clamp(4rem, 9vw, 8rem);
    scroll-margin-top: 6rem;
  }

  .filters {
    display: grid;
    grid-template-columns:
      minmax(16rem, 2fr) repeat(2, minmax(10rem, 1fr))
      auto;
    align-items: end;
    gap: 0.75rem;
    margin-bottom: 2rem;
    padding: 1rem;
    border-block: 1px solid var(--line);
    background: var(--wash);
  }

  .filters label {
    display: grid;
    gap: 0.35rem;
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 600;
  }

  .filters :is(input, select, button),
  .zero-results button {
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }

  .filters :is(input, select) {
    width: 100%;
    padding: 0 0.7rem;
  }

  .filters button,
  .zero-results button {
    padding: 0 1rem;
    cursor: pointer;
  }

  .example-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
  }

  .result-count {
    color: var(--muted);
    white-space: nowrap;
  }

  .filter-notice,
  .zero-results {
    margin: 1.5rem 0;
  }

  .zero-results {
    border-left: 3px solid var(--accent);
    padding: 1rem 1.25rem;
  }

  @media (max-width: 64rem) {
    .featured-gallery ol {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .filters {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 42rem) {
    .gallery-intro {
      padding-top: 2rem;
    }

    .section-heading {
      align-items: start;
    }

    .featured-gallery {
      margin-inline: -1rem;
    }

    .featured-gallery .section-heading {
      margin-inline: 1rem;
    }

    .featured-gallery ol {
      grid-auto-columns: min(85vw, 21rem);
      grid-template-columns: none;
      grid-auto-flow: column;
      gap: 1rem;
      overflow-x: auto;
      scroll-padding-inline: 1rem;
      scroll-snap-type: x mandatory;
      padding-inline: 1rem;
    }

    .featured-gallery li {
      scroll-snap-align: start;
    }

    .filters {
      grid-template-columns: 1fr;
      margin-inline: -1rem;
      padding-inline: 1rem;
    }
  }
</style>
