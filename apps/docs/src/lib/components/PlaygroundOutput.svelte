<script lang="ts">
  import { copyText, MANUAL_COPY_STATUS } from "$lib/clipboard";

  const {
    code,
    enabled,
  }: {
    code: string;
    enabled: boolean;
  } = $props();

  let source = $state<HTMLElement>();
  let status = $state("");

  async function copy(): Promise<void> {
    if (!enabled || source === undefined) return;
    const result = await copyText(code, source);
    status =
      result === "copied" ? "Svelte component copied." : MANUAL_COPY_STATUS;
  }
</script>

<div class="panel-heading">
  <div>
    <p class="panel-number">03</p>
    <h2>Take the Svelte component</h2>
  </div>
  <button type="button" onclick={copy} disabled={!enabled}>Copy Svelte</button>
</div>

{#if enabled}
  <p class="output-note">
    This complete file contains the last render-confirmed PortableSpec.
  </p>
{:else}
  <p class="output-note blocked">
    Apply and render the draft successfully before copying or sharing output.
  </p>
{/if}

<!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard users must reach the scrollable source) -->
<pre role="region" aria-label="Generated Svelte component" tabindex="0"><code
    bind:this={source}>{code}</code
  ></pre>
<p class="copy-status" role="status" aria-live="polite">{status}</p>

<style>
  :global(.output-surface) {
    padding: 1rem;
  }

  .panel-heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.75rem;
  }

  .panel-heading h2,
  .panel-heading p,
  .output-note,
  .copy-status {
    margin: 0;
  }

  .panel-heading h2 {
    margin-top: 0.15rem;
    font-size: 1.05rem;
  }

  .panel-number {
    color: var(--accent);
    font: 700 0.7rem/1 var(--body-font);
    letter-spacing: 0.08em;
  }

  button {
    min-height: 44px;
    border: 1px solid var(--ink);
    border-radius: 2px;
    padding: 0.55rem 0.7rem;
    background: var(--ink);
    color: var(--paper);
    font: 650 0.82rem/1 var(--body-font);
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .output-note,
  .copy-status {
    min-height: 2.7rem;
    padding-block: 0.75rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .output-note.blocked {
    color: #9b2c20;
  }

  pre {
    max-height: 37rem;
    margin: 0;
    overflow: auto;
    border-block: 1px solid var(--line);
    padding: 0.85rem;
    background: var(--code-paper);
    color: var(--code-ink);
    font: 0.74rem/1.55 var(--mono-font);
    white-space: pre;
  }

  @media (max-width: 47.99rem) {
    :global(.output-surface) {
      padding: 1rem 0;
    }

    pre {
      max-height: 24rem;
    }
  }
</style>
