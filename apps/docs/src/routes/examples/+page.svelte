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

  // One flat grid; the former featured six lead, the rest follow in
  // manifest order.
  const all = EXAMPLES.map((entry) => galleryEntryFor(entry));
  const leadIds = new Set<string>(FEATURED_EXAMPLES.map((item) => item.id));
  const entries = [
    ...[...leadIds].map((id) => all.find((entry) => entry.id === id)!),
    ...all.filter((entry) => !leadIds.has(entry.id)),
  ];
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
    readLocation();
    if (resetNotice) {
      const url = new URL(location.href);
      url.search = serializeGalleryFilter(filters, url.searchParams).toString();
      history.replaceState(null, "", url);
    }
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  });
</script>

<svelte:window onpopstate={readLocation} />

<svelte:head><meta name="theme-color" content="#ffffff" /></svelte:head>

<header class="gallery-intro">
  <h1>Examples</h1>
</header>

<section class="catalog" aria-label="Examples">
  <form class="filters" onsubmit={(event) => event.preventDefault()}>
    <label>
      <span>Filter</span>
      <input
        type="search"
        placeholder="legend, facet, canvas…"
        bind:value={filters.query}
        oninput={updateQuery}
      />
    </label>
    <label>
      <span>Category</span>
      <select value={filters.categories[0] ?? ""} onchange={updateCategory}>
        <option value="">All</option>
        {#each categories as category (category)}<option value={category}
            >{category}</option
          >{/each}
      </select>
    </label>
    <label>
      <span>Tag</span>
      <select value={filters.tags[0] ?? ""} onchange={updateTag}>
        <option value="">All</option>
        {#each tags as tag (tag)}<option value={tag}>{tag}</option>{/each}
      </select>
    </label>
    <button type="button" onclick={clearFilters}>Clear</button>
  </form>

  {#if resetNotice}
    <p class="filter-notice" aria-live="polite">
      Unsupported filters were reset.
    </p>
  {/if}

  {#if results.length === 0}
    <div class="zero-results">
      <h3>No matches.</h3>
      <p>Broaden the query or clear filters.</p>
      <button type="button" onclick={clearFilters}>Clear</button>
    </div>
  {:else}
    <ul class="example-grid">
      {#each results as entry (entry.id)}
        <li>
          <a href={`${base}/examples/${entry.id}`} aria-label={entry.title}>
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
    margin: 0.25rem 0 0;
    font-size: clamp(3rem, 8vw, 6.5rem);
    line-height: 0.88;
  }

  .example-grid {
    display: grid;
    gap: 1.25rem;
    margin: 0;
    padding: 0;
    list-style: none;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
  }

  figure {
    margin: 0;
  }

  .example-grid a {
    color: inherit;
    text-decoration: none;
  }

  .preview-paper {
    display: grid;
    aspect-ratio: 4 / 3;
    place-items: center;
    overflow: hidden;
  }

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .filters {
    display: grid;
    grid-template-columns:
      minmax(16rem, 2fr) repeat(2, minmax(10rem, 1fr))
      auto;
    align-items: end;
    gap: 0.75rem;
    margin-bottom: 2rem;
    padding: 1rem 0;
    border-block: 1px solid var(--line);
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

  .filter-notice,
  .zero-results {
    margin: 1.5rem 0;
  }

  .zero-results {
    border-left: 3px solid var(--accent);
    padding: 1rem 1.25rem;
  }

  @media (max-width: 64rem) {
    .filters {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 42rem) {
    .gallery-intro {
      padding-top: 2rem;
    }

    .filters {
      grid-template-columns: 1fr;
    }
  }
</style>
