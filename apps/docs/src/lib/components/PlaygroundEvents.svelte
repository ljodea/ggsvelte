<script lang="ts">
  import UiButton from "$lib/components/UiButton.svelte";
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
  let open = $state(false);
  let hasAutoExpanded = $state(false);

  // OV4-A: auto-expand the first time a real interaction event fires.
  $effect(() => {
    if (hasAutoExpanded || entries.length === 0) return;
    const reduce =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    hasAutoExpanded = true;
    if (reduce) {
      open = true;
      return;
    }
    // Non-jarring: open on next frame without animation thrash.
    requestAnimationFrame(() => {
      open = true;
    });
  });
</script>

<details class="event-inspector" bind:open>
  <summary>
    <span>Interaction events</span>
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
      <UiButton type="button" onclick={onClear} disabled={entries.length === 0}>
        Clear events
      </UiButton>
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
            <pre class="code-surface" tabindex="0"><code>{entry.json}</code
              ></pre>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
</details>

<style>
  .event-inspector {
    margin-top: 3rem;
    padding-top: 1rem;
    border-top: 1px solid var(--line);
  }

  summary::before {
    content: "▸";
    margin-right: 0.4rem;
    color: var(--muted);
    font-size: 0.7rem;
  }

  details[open] summary::before {
    content: "▾";
  }

  summary {
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.35rem 0;
    cursor: pointer;
    font-weight: 600;
  }

  .count,
  .event-intro p,
  .empty,
  li header span {
    color: var(--muted);
    font-size: 0.8rem;
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
  }

  @media (max-width: 44.99rem) {
    .event-intro {
      display: grid;
    }
  }
</style>
