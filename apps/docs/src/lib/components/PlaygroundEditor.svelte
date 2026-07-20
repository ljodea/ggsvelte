<script lang="ts">
  import { tick } from "svelte";

  import type { PlaygroundDiagnostic } from "$lib/playground-state";

  const {
    draft,
    samples,
    selectedSample,
    diagnostics,
    pending,
    canUndo,
    onEdit,
    onApply,
    onUndo,
    onReset,
    onLoadSample,
  }: {
    draft: string;
    samples: readonly { id: string; title: string; description: string }[];
    selectedSample: string;
    diagnostics: readonly PlaygroundDiagnostic[];
    pending: boolean;
    canUndo: boolean;
    onEdit: (draft: string) => void;
    onApply: () => void;
    onUndo: () => void;
    onReset: () => void;
    onLoadSample: (id: string) => boolean;
  } = $props();

  let alertElement = $state<HTMLDivElement>();
  let focusedSignature = "";

  $effect(() => {
    const signature = diagnostics
      .map((item) => `${item.source}:${item.code}:${item.path}`)
      .join("|");
    if (signature === "") {
      focusedSignature = "";
      return;
    }
    if (signature === focusedSignature) return;
    focusedSignature = signature;
    void tick().then(() => alertElement?.focus());
  });
</script>

<div class="panel-heading">
  <div>
    <p class="panel-number">02</p>
    <h2>Edit the PortableSpec</h2>
  </div>
  <p>JSON only. No code runs.</p>
</div>

<div class="source-picker">
  <label for="playground-sample">Start from a sample</label>
  <select
    id="playground-sample"
    value={selectedSample}
    onchange={(event) => {
      if (!onLoadSample(event.currentTarget.value)) {
        event.currentTarget.value = selectedSample;
      }
    }}
  >
    <option value="">Current shared or custom chart</option>
    {#each samples as sample (sample.id)}
      <option value={sample.id}>{sample.title}</option>
    {/each}
  </select>
  {#if selectedSample !== ""}
    <p>{samples.find((sample) => sample.id === selectedSample)?.description}</p>
  {/if}
</div>

<form
  onsubmit={(event) => {
    event.preventDefault();
    onApply();
  }}
>
  <label for="playground-spec">PortableSpec JSON</label>
  <textarea
    id="playground-spec"
    value={draft}
    oninput={(event) => onEdit(event.currentTarget.value)}
    spellcheck="false"
    rows="23"
    aria-describedby="playground-editor-limits"></textarea>
  <p class="limits" id="playground-editor-limits">
    Shared state: 12 KiB decoded, 500 inline rows, 64 fields, depth 8.
  </p>

  {#if diagnostics.length > 0}
    <div
      class="diagnostics"
      role="alert"
      tabindex="-1"
      bind:this={alertElement}
    >
      <strong>Draft not applied</strong>
      <ol>
        {#each diagnostics as diagnostic (`${diagnostic.source}:${diagnostic.code}:${diagnostic.path}`)}
          <li>
            <p class="diagnostic-identity">
              <span>{diagnostic.source}</span>
              <code>{diagnostic.code}</code>
            </p>
            {#if diagnostic.path !== ""}<span>{diagnostic.path}</span>{/if}
            <p>{diagnostic.message}</p>
            {#if diagnostic.fix !== undefined}<p class="fix">
                Fix: {diagnostic.fix}
              </p>{/if}
          </li>
        {/each}
      </ol>
    </div>
  {/if}

  <div class="editor-actions">
    <button class="primary" type="submit" disabled={pending}
      >{pending ? "Checking…" : "Apply draft"}</button
    >
    <button type="button" onclick={onUndo} disabled={pending || !canUndo}
      >Undo chart</button
    >
    <button type="button" onclick={onReset} disabled={pending}
      >Reset source</button
    >
  </div>
</form>

<style>
  :global(.editor-surface) {
    padding: 1rem;
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.75rem;
  }

  .panel-heading h2,
  .panel-heading p,
  .source-picker p {
    margin: 0;
  }

  .panel-heading h2 {
    margin-top: 0.15rem;
    font-size: 1.05rem;
  }

  .panel-heading > p,
  .source-picker p,
  .limits {
    color: var(--muted);
    font-size: 0.78rem;
  }

  .panel-number {
    color: var(--accent);
    font: 700 0.7rem/1 var(--body-font);
    letter-spacing: 0.08em;
  }

  .source-picker,
  form {
    display: grid;
    gap: 0.55rem;
    margin-top: 1rem;
  }

  label {
    font-weight: 650;
  }

  select,
  textarea,
  button {
    min-height: 44px;
    border: 1px solid var(--line);
    border-radius: 2px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }

  select,
  button {
    padding: 0.55rem 0.7rem;
  }

  textarea {
    width: 100%;
    min-height: 27rem;
    padding: 0.75rem;
    resize: vertical;
    font: 0.76rem/1.5 var(--mono-font);
    tab-size: 2;
  }

  .limits {
    margin: 0;
  }

  .diagnostics {
    display: grid;
    gap: 0.5rem;
    border-left: 3px solid var(--danger, #b42318);
    padding: 0.75rem;
    background: color-mix(in srgb, #b42318 7%, var(--paper));
  }

  .diagnostics ol {
    display: grid;
    gap: 0.75rem;
    margin: 0;
    padding-left: 1.2rem;
  }

  .diagnostic-identity {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: baseline;
  }

  .diagnostic-identity span {
    color: var(--accent);
    font: 700 0.68rem/1 var(--body-font);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .diagnostics li p,
  .diagnostics li > span {
    margin: 0.2rem 0 0;
    overflow-wrap: anywhere;
    font-size: 0.82rem;
  }

  .diagnostics li > span {
    display: block;
    color: var(--muted);
    font-family: var(--mono-font);
  }

  .diagnostics .fix {
    color: var(--muted);
  }

  .editor-actions {
    display: flex;
    gap: 0.55rem;
    padding-top: 0.35rem;
  }

  button {
    cursor: pointer;
    font-weight: 650;
  }

  button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: white;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  @media (max-width: 47.99rem) {
    :global(.editor-surface) {
      padding: 1rem 0;
    }

    textarea {
      min-height: 20rem;
    }

    .editor-actions {
      position: sticky;
      bottom: 0;
      z-index: 2;
      margin-inline: -0.35rem;
      padding: 0.75rem 0.35rem;
      background: color-mix(in srgb, var(--paper) 94%, transparent);
      backdrop-filter: blur(8px);
    }
  }
</style>
