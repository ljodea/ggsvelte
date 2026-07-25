<script lang="ts">
  import {
    PLAYGROUND_EXAMPLE_PROMPTS,
    type PlaygroundExamplePrompt,
  } from "$lib/playground-prompts";

  let {
    samples = [],
    busy = false,
    onExample,
    onLoadSample,
  }: {
    samples?: readonly { id: string; title: string }[];
    busy?: boolean;
    onExample: (example: PlaygroundExamplePrompt) => void;
    onLoadSample: (id: string) => void;
  } = $props();
</script>

<!--
  The browse catalogue sits BELOW the chart (#708). Above it, thirteen wrapping
  44px links pushed the chart 1211px down a 844px-tall phone — chart-first is a
  layout promise, not a slogan. Nothing is dropped: every example and sample is
  still in the DOM and clickable.
-->
<div class="quiet-links">
  <span class="quiet-label">Examples</span>
  {#each PLAYGROUND_EXAMPLE_PROMPTS as example (example.id)}
    <button
      type="button"
      class="text-link"
      onclick={() => onExample(example)}
      disabled={busy}
    >
      {example.label}
    </button>
  {/each}
  <span class="quiet-label samples-label">Samples</span>
  {#each samples as sample (sample.id)}
    <button
      type="button"
      class="text-link"
      onclick={() => onLoadSample(sample.id)}
      disabled={busy}
    >
      {sample.title}
    </button>
  {/each}
</div>

<style>
  .quiet-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.15rem 0.85rem;
    /* Bottom spacing comes from .code-section's 3rem top margin below. */
    margin-top: 1.5rem;
  }

  .quiet-label {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .samples-label {
    margin-left: 0.5rem;
  }

  .text-link {
    appearance: none;
    border: 0;
    background: none;
    padding: 0.35rem 0.15rem;
    min-height: 44px;
    color: var(--accent);
    font: inherit;
    cursor: pointer;
    text-decoration: none;
  }

  .text-link:hover {
    text-decoration: underline;
  }

  .text-link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: none;
  }
</style>
