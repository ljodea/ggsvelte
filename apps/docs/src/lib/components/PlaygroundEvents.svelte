<script lang="ts">
  import {
    PLAYGROUND_MAX_EVENTS,
    type PlaygroundEventEntry,
  } from "$lib/playground-events";

  const {
    entries,
    onClear,
  }: {
    entries: readonly PlaygroundEventEntry[];
    onClear: () => void;
  } = $props();

  const newestFirst = $derived(entries.toReversed());
</script>

<details class="event-inspector">
  <summary>
    <span>Semantic events</span>
    <span class="count"
      >{entries.length} / {PLAYGROUND_MAX_EVENTS} local records</span
    >
  </summary>
  <div class="event-body">
    <div class="event-intro">
      <p>
        Interact with a mark to inspect public <code>oninteraction</code>
        payloads. This chart-local log is never persisted or shared.
      </p>
      <button type="button" onclick={onClear} disabled={entries.length === 0}
        >Clear events</button
      >
    </div>
    {#if newestFirst.length === 0}
      <p class="empty">
        No semantic events yet. Move to or focus a chart mark.
      </p>
    {:else}
      <ol aria-label="Semantic event log">
        {#each newestFirst as entry (entry.sequence)}
          <li>
            <header>
              <strong>{entry.type}/{entry.phase}</strong>
              <span>#{entry.sequence} · {entry.source}</span>
            </header>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex (event JSON is scrollable) -->
            <pre tabindex="0"><code>{entry.json}</code></pre>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</details>

<style>
  .event-inspector {
    margin-top: 1rem;
    border-block: 1px solid var(--line);
  }

  summary {
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.6rem 0;
    cursor: pointer;
    font-weight: 700;
  }

  .count,
  .event-intro p,
  .empty,
  li header span {
    color: var(--muted);
    font-size: 0.75rem;
  }

  .event-body {
    padding-block: 0.75rem 1rem;
  }

  .event-intro {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
  }

  .event-intro p,
  .empty {
    margin: 0;
  }

  button {
    min-height: 44px;
    flex: 0 0 auto;
    border: 1px solid var(--line);
    border-radius: 2px;
    padding: 0.55rem 0.7rem;
    background: var(--paper);
    color: var(--ink);
    font: 650 0.78rem/1 var(--body-font);
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  ol {
    display: grid;
    gap: 0.75rem;
    margin: 1rem 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    min-width: 0;
    border-left: 2px solid var(--accent);
    padding-left: 0.65rem;
  }

  li header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
  }

  pre {
    max-height: 16rem;
    margin: 0.45rem 0 0;
    overflow: auto;
    padding: 0.65rem;
    background: var(--code-paper);
    color: var(--code-ink);
    font: 0.7rem/1.5 var(--mono-font);
  }

  @media (max-width: 47.99rem) {
    summary,
    .event-intro,
    li header {
      align-items: start;
    }

    .event-intro {
      display: grid;
    }
  }
</style>
