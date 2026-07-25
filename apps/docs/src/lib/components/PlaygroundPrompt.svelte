<script lang="ts">
  import UiButton from "$lib/components/UiButton.svelte";
  import {
    PLAYGROUND_DATASET_SCHEMAS,
    PLAYGROUND_PROMPT_MAX_CHARS,
    type PlaygroundDatasetId,
  } from "$lib/playground-dataset-schemas";
  import type { PlaygroundAgentFailure } from "$lib/playground-agent-state";
  import type { SpecError } from "@ggsvelte/spec";

  let {
    prompt = $bindable(""),
    datasetId = $bindable("penguins" as PlaygroundDatasetId),
    phaseLine = "",
    failure = null,
    busy = false,
    generateDisabled = false,
    generateLabel = "Generate",
    samples = [],
    onGenerate,
    onCancel,
    onLoadSample,
    onCopyHandoff,
  }: {
    prompt?: string;
    datasetId?: PlaygroundDatasetId;
    phaseLine?: string;
    failure?: PlaygroundAgentFailure | null;
    busy?: boolean;
    generateDisabled?: boolean;
    generateLabel?: string;
    samples?: readonly { id: string; title: string }[];
    onGenerate: () => void;
    onCancel: () => void;
    onLoadSample: (id: string) => void;
    onCopyHandoff: () => void;
  } = $props();

  let detailsOpen = $state(false);

  // The alert is a decision, not a second copy of the browse row below it:
  // offer a few recovery charts, not the whole catalogue.
  const RECOVERY_SAMPLE_LIMIT = 3;
  const recoverySamples = $derived(samples.slice(0, RECOVERY_SAMPLE_LIMIT));

  const canSubmit = $derived(
    prompt.trim() !== "" && !generateDisabled && !busy,
  );

  function formatDetails(errors: readonly SpecError[] | undefined): string {
    if (errors === undefined || errors.length === 0) return "";
    return errors
      .map((error) => {
        const fix = error.fix?.example
          ? `\n  fix.example: ${JSON.stringify(error.fix.example)}`
          : error.fix?.description
            ? `\n  fix: ${error.fix.description}`
            : "";
        const allowed =
          error.allowed === undefined
            ? ""
            : `\n  allowed: ${error.allowed.join(", ")}`;
        return `${error.code} @ ${error.path}\n  ${error.message}${allowed}${fix}`;
      })
      .join("\n\n");
  }
</script>

<div class="prompt-strip">
  <div class="prompt-row">
    <div class="prompt-field">
      <label class="prompt-label" for="playground-prompt"
        >Rewrite this chart</label
      >
      <textarea
        id="playground-prompt"
        class="prompt-input"
        rows="1"
        maxlength={PLAYGROUND_PROMPT_MAX_CHARS}
        bind:value={prompt}
        aria-describedby={failure !== null
          ? "playground-phase playground-alert"
          : "playground-phase"}></textarea>
    </div>
    <div class="dataset-field">
      <label class="dataset-label" for="playground-dataset">Dataset</label>
      <select
        id="playground-dataset"
        class="dataset-select"
        bind:value={datasetId}
        disabled={busy}
      >
        {#each PLAYGROUND_DATASET_SCHEMAS as ds (ds.id)}
          <option value={ds.id}>{ds.label}</option>
        {/each}
      </select>
    </div>
    <UiButton
      type="button"
      variant="primary"
      onclick={onGenerate}
      disabled={!canSubmit}
    >
      {generateLabel}
    </UiButton>
    {#if busy}
      <button type="button" class="text-action" onclick={onCancel}
        >Cancel</button
      >
    {/if}
  </div>

  <p id="playground-phase" class="phase" role="status" aria-live="polite">
    {phaseLine}
  </p>

  {#if failure !== null}
    <div id="playground-alert" class="alert" role="alert">
      <p>{failure.message}</p>
      {#if failure.details !== undefined && failure.details.length > 0}
        <details bind:open={detailsOpen} class="details">
          <summary>Details</summary>
          <pre class="details-pre">{formatDetails(failure.details)}</pre>
        </details>
      {/if}
      <p class="next-action">
        Try one of these instead —
        {#each recoverySamples as sample, i (sample.id)}
          {#if i > 0}<span class="sep"> · </span>{/if}
          <button
            type="button"
            class="text-link"
            onclick={() => onLoadSample(sample.id)}
          >
            {sample.title}
          </button>
        {/each}
      </p>
      <button type="button" class="text-link secondary" onclick={onCopyHandoff}>
        Copy prompt for your own agent
      </button>
    </div>
  {/if}
</div>

<style>
  .prompt-strip {
    display: grid;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .prompt-row {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    gap: 0.5rem 0.75rem;
  }

  .prompt-field {
    flex: 1 1 16rem;
    min-width: 12rem;
    display: grid;
    gap: 0.25rem;
  }

  .dataset-field {
    display: grid;
    gap: 0.25rem;
  }

  .prompt-label,
  .dataset-label {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .prompt-input {
    width: 100%;
    min-height: 3rem;
    max-height: 6rem;
    resize: vertical;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--paper);
    color: var(--ink);
    font: 1rem/1.4 var(--body-font);
  }

  .dataset-select {
    min-height: 44px;
    padding: 0 0.65rem;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--paper);
    color: var(--ink);
    font: 0.95rem/1.2 var(--body-font);
  }

  .text-action,
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

  .text-link:hover,
  .text-action:hover {
    text-decoration: underline;
  }

  .text-link:disabled,
  .text-action:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: none;
  }

  .text-link.secondary {
    color: var(--muted);
  }

  .phase {
    margin: 0;
    min-height: 1.25rem;
    color: var(--muted);
    font-size: 0.875rem;
  }

  .alert {
    display: grid;
    gap: 0.5rem;
  }

  .alert p {
    margin: 0;
    font-size: 1rem;
  }

  .next-action {
    color: var(--ink);
  }

  .sep {
    color: var(--muted);
  }

  .details {
    font-size: 0.875rem;
  }

  .details summary {
    display: flex;
    align-items: center;
    min-height: 44px;
    cursor: pointer;
  }

  .details-pre {
    max-height: 12rem;
    overflow: auto;
    margin: 0.35rem 0 0;
    padding: 0.65rem;
    background: var(--code-paper);
    color: var(--code-ink);
    font: 0.75rem/1.45 var(--code-font);
    border-radius: 4px;
    white-space: pre-wrap;
  }

  @media (max-width: 44.99rem) {
    /* Stack: full-width prompt, then dataset + Generate on one row. */
    .prompt-field {
      flex: 1 1 100%;
    }

    .dataset-field {
      flex: 1 1 auto;
    }
  }
</style>
