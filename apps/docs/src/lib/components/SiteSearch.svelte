<script lang="ts">
  import { base } from "$app/paths";

  import { DOCS_TASKS } from "$lib/catalog/docs-tasks";
  import { DOCS_SEARCH_INDEX } from "$lib/generated/search-index";
  import { searchDocs } from "$lib/search";

  let dialog = $state<HTMLDialogElement>();
  let input = $state<HTMLInputElement>();
  let returnFocus = $state<HTMLElement>();
  let query = $state("");
  let activeIndex = $state(-1);
  const results = $derived(searchDocs(query, DOCS_SEARCH_INDEX));
  const expanded = $derived(query.trim() !== "" && results.length > 0);
  const activeId = $derived(
    activeIndex >= 0 && activeIndex < results.length
      ? `docs-search-option-${results[activeIndex]!.id}`
      : undefined,
  );

  export function open(trigger: HTMLElement): void {
    returnFocus = trigger;
    query = "";
    activeIndex = -1;
    dialog?.showModal();
    queueMicrotask(() => input?.focus());
  }

  function close(): void {
    dialog?.close();
  }

  function restoreFocus(): void {
    returnFocus?.focus();
  }

  function closeFromBackdrop(event: MouseEvent): void {
    if (event.target === dialog) close();
  }

  function updateQuery(event: Event): void {
    query = (event.currentTarget as HTMLInputElement).value;
    activeIndex = searchDocs(query, DOCS_SEARCH_INDEX).length > 0 ? 0 : -1;
  }

  function moveActive(next: number): void {
    if (results.length === 0) return;
    activeIndex = (next + results.length) % results.length;
  }

  function scrollActiveIntoView(): void {
    if (activeId === undefined) return;
    document
      .querySelector(`#${CSS.escape(activeId)}`)
      ?.scrollIntoView({ block: "nearest" });
  }

  $effect(() => {
    // Keyboard navigation keeps focus on the combobox; scroll the selected option
    // into the results scrollport so Enter target stays visible.
    void activeIndex;
    void results.length;
    queueMicrotask(scrollActiveIntoView);
  });

  function followActive(): void {
    const result = results[activeIndex];
    if (result === undefined) return;
    close();
    window.location.assign(`${base}${result.href}`);
  }

  function handleKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case "ArrowDown":
        if (results.length === 0) return;
        event.preventDefault();
        moveActive(activeIndex + 1);
        break;
      case "ArrowUp":
        if (results.length === 0) return;
        event.preventDefault();
        moveActive(activeIndex - 1);
        break;
      case "Home":
        if (results.length === 0) return;
        event.preventDefault();
        activeIndex = 0;
        break;
      case "End":
        if (results.length === 0) return;
        event.preventDefault();
        activeIndex = results.length - 1;
        break;
      case "Enter":
        if (activeIndex < 0) return;
        event.preventDefault();
        followActive();
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
    }
  }
</script>

<dialog
  class="site-search"
  bind:this={dialog}
  aria-labelledby="docs-search-heading"
  onclick={closeFromBackdrop}
  onclose={restoreFocus}
>
  <section class="site-search__panel">
    <header>
      <h2 id="docs-search-heading">Search documentation</h2>
      <button
        type="button"
        aria-label="Close documentation search"
        onclick={close}>Close</button
      >
    </header>

    <label for="docs-search-input">Search docs</label>
    <input
      id="docs-search-input"
      bind:this={input}
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-haspopup="listbox"
      aria-expanded={expanded}
      aria-controls="docs-search-results"
      aria-activedescendant={activeId}
      autocomplete="off"
      placeholder="API, task, example, or diagnostic"
      value={query}
      oninput={updateQuery}
      onkeydown={handleKeydown}
    />

    <p class="search-status" role="status">
      {#if query.trim() !== ""}
        {results.length === 0
          ? "No matching documentation."
          : `${results.length} ${results.length === 1 ? "result" : "results"}.`}
      {/if}
    </p>

    <ul
      id="docs-search-results"
      class="search-results"
      role="listbox"
      aria-label="Results"
    >
      {#each results as result, index (result.id)}
        <li>
          <a
            id={`docs-search-option-${result.id}`}
            role="option"
            aria-selected={index === activeIndex}
            href={`${base}${result.href}`}
            onmouseenter={() => (activeIndex = index)}
            onfocus={() => (activeIndex = index)}
            onclick={close}
          >
            <span>{result.kind}</span>
            <strong>{result.title}</strong>
            <small>{result.summary}</small>
          </a>
        </li>
      {/each}
    </ul>

    {#if query.trim() === "" || results.length === 0}
      <nav
        class="search-tasks"
        aria-label={query.trim() === "" ? "Start with a task" : "Try a task"}
      >
        <p>
          {query.trim() === "" ? "Start with a task" : "Try a task instead"}
        </p>
        {#each DOCS_TASKS as task (task.label)}
          <a href={`${base}${task.hrefs[0]}`} onclick={close}>{task.label}</a>
        {/each}
      </nav>
    {/if}
  </section>
</dialog>

<style>
  .site-search {
    width: min(46rem, calc(100vw - 2rem));
    max-width: none;
    max-height: min(44rem, calc(100vh - 2rem));
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 18px 60px color-mix(in srgb, #000 24%, transparent);
  }

  .site-search::backdrop {
    background: color-mix(in srgb, #000 45%, transparent);
  }

  .site-search__panel {
    padding: 1rem;
  }

  header {
    display: flex;
    min-height: 3rem;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--line);
  }

  h2,
  header button,
  label,
  input {
    font-family: var(--body-font);
  }

  h2 {
    margin: 0;
    font-family: var(--display-font);
    font-size: 1.3rem;
  }

  header button {
    min-width: 44px;
    min-height: 44px;
    border: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-weight: 600;
  }

  label {
    display: block;
    margin: 1rem 0 0.4rem;
    font-size: 0.82rem;
    font-weight: 600;
  }

  input {
    width: 100%;
    min-height: 3.25rem;
    padding: 0.65rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    background: var(--paper);
    color: var(--ink);
    font-size: 1rem;
  }

  .search-status {
    min-height: 1.4rem;
    margin: 0.45rem 0;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .search-results {
    max-height: min(27rem, 56vh);
    margin: 0;
    padding: 0;
    overflow-y: auto;
    border-top: 1px solid var(--line);
    list-style: none;
  }

  .search-results a {
    display: grid;
    min-height: 4.75rem;
    align-content: center;
    padding: 0.7rem 0.8rem;
    border-bottom: 1px solid var(--line);
    color: var(--ink);
    text-decoration: none;
    gap: 0.15rem;
  }

  .search-results a[aria-selected="true"] {
    outline: 2px solid var(--accent);
    outline-offset: -2px;
    background: var(--wash);
  }

  .search-results span {
    color: var(--muted);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .search-results strong {
    font-family: var(--display-font);
    font-size: 1rem;
  }

  .search-results small {
    overflow: hidden;
    color: var(--muted);
    font-size: 0.78rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-tasks {
    display: grid;
    padding-top: 0.5rem;
  }

  .search-tasks p {
    margin: 0 0 0.25rem;
    color: var(--muted);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .search-tasks a {
    min-height: 40px;
    padding: 0.55rem 0;
    border-bottom: 1px solid var(--line);
    color: var(--ink);
  }

  @media (max-width: 40rem) {
    .site-search {
      width: 100%;
      height: 100%;
      max-height: none;
      margin: 0;
      border: 0;
      border-radius: 0;
    }

    .site-search__panel {
      padding: 0.75rem 1rem 1.5rem;
    }

    .search-results {
      max-height: 48vh;
    }
  }

  @media (forced-colors: active) {
    .site-search,
    input,
    .search-results a[aria-selected="true"] {
      border: 1px solid CanvasText;
      background: Canvas;
      color: CanvasText;
    }
  }
</style>
