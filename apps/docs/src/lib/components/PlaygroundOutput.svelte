<script lang="ts">
  import { tick, untrack } from "svelte";

  import { copyText, MANUAL_COPY_STATUS } from "$lib/clipboard";
  import UiButton from "$lib/components/UiButton.svelte";
  import { playgroundSVGExport } from "$lib/playground-export";
  import type { PlaygroundOutput } from "$lib/playground-output";
  import { nextRovingTabIndex } from "$lib/tab-roving";
  import type { PortableSpec } from "@ggsvelte/spec";

  const {
    outputs,
    rendered,
    enabled,
  }: {
    outputs: readonly PlaygroundOutput[];
    rendered: PortableSpec;
    enabled: boolean;
  } = $props();

  let active = $state(0);
  let fallbackSource = $state<HTMLElement>();
  let fallbackCode = $state("");
  let fallbackLabel = $state("output");
  let manualFallback = $state(false);
  let copying = $state(false);
  let copyStatus = $state("");
  let exportStatus = $state("");
  let outputRevision = 0;
  const tabsetId = $props.id();
  const panelId = `${tabsetId}-panel`;
  const activeOutput = $derived(outputs[active] ?? outputs[0]!);

  $effect(() => {
    const nextOutputs = outputs;
    untrack(() => {
      outputRevision += 1;
      if (active >= nextOutputs.length) active = 0;
      const hadFallback = fallbackCode !== "";
      fallbackCode = "";
      fallbackLabel = "output";
      manualFallback = false;
      copyStatus = "";
      copying = false;
      if (hadFallback) getSelection()?.removeAllRanges();
    });
  });

  function select(index: number): void {
    if (copying) return;
    active = index;
    copyStatus = "";
  }

  function handleTabKey(event: KeyboardEvent, index: number): void {
    const next = nextRovingTabIndex(event.key, index, outputs.length);
    if (next === null) return;
    event.preventDefault();
    select(next);
    const target = event.currentTarget;
    if (!(target instanceof HTMLButtonElement)) return;
    const buttons =
      target.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }

  async function copy(): Promise<void> {
    if (!enabled || !activeOutput.supported || copying) return;
    const selected = activeOutput;
    const revision = outputRevision;
    fallbackCode = selected.code;
    fallbackLabel = selected.label;
    manualFallback = false;
    copying = true;
    await tick();
    if (fallbackSource === undefined) {
      copying = false;
      return;
    }
    const result = await copyText(selected.code, fallbackSource);
    if (revision !== outputRevision) return;
    copying = false;
    manualFallback = result !== "copied";
    copyStatus =
      result === "copied"
        ? `${selected.label} output copied.`
        : MANUAL_COPY_STATUS;
  }

  function exportSVG(): void {
    if (!enabled) return;
    exportStatus = "";
    const result = playgroundSVGExport(rendered);
    if (!result.ok) {
      exportStatus = `SVG export failed · ${result.diagnostic.source}/${result.diagnostic.code}: ${result.diagnostic.message} ${result.diagnostic.fix ?? ""}`;
      return;
    }

    let objectUrl: string | null = null;
    try {
      const blob = new Blob([result.svg], {
        type: "image/svg+xml;charset=utf-8",
      });
      objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = result.filename;
      anchor.click();
      exportStatus = "SVG downloaded.";
    } catch (error) {
      exportStatus = `SVG export failed · export/download-failed: ${error instanceof Error ? error.message : "The browser refused the download."} The chart and outputs were retained.`;
    } finally {
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
    }
  }
</script>

<div class="panel-heading">
  <div>
    <p class="panel-number">03</p>
    <h2>Export</h2>
  </div>
  <div class="output-actions">
    <UiButton
      type="button"
      variant="secondary"
      onclick={exportSVG}
      disabled={!enabled}
    >
      Download SVG
    </UiButton>
    <UiButton
      type="button"
      variant="primary"
      onclick={copy}
      disabled={!enabled || !activeOutput.supported || copying}
    >
      {copying ? "Copying…" : `Copy ${activeOutput.label}`}
    </UiButton>
  </div>
</div>

{#if !enabled}
  <p class="output-note blocked">
    Apply and render the draft successfully before copying, sharing, or
    exporting.
  </p>
{/if}

<div class="output-tabs">
  <div class="tab-list" role="tablist" aria-label="Generated output formats">
    {#each outputs as output, index (output.kind)}
      <button
        id={`${tabsetId}-tab-${String(index)}`}
        type="button"
        role="tab"
        aria-controls={panelId}
        aria-selected={active === index}
        tabindex={active === index ? 0 : -1}
        class:active={active === index}
        aria-disabled={copying}
        onclick={() => select(index)}
        onkeydown={(event) => handleTabKey(event, index)}>{output.label}</button
      >
    {/each}
  </div>
  <div
    id={panelId}
    role="tabpanel"
    aria-labelledby={`${tabsetId}-tab-${String(active)}`}
  >
    {#if activeOutput.supported}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex (keyboard users must reach the scrollable source) -->
      <pre
        role="region"
        aria-label={activeOutput.kind === "svelte"
          ? "Generated Svelte component"
          : `Generated ${activeOutput.label} output`}
        tabindex="0"><code>{activeOutput.code}</code></pre>
    {:else}
      <div class="unsupported" role="status">
        <strong>Builder output unavailable for this chart</strong>
        <p>{activeOutput.reason}</p>
      </div>
    {/if}
  </div>
</div>
<p class="action-status" role="status" aria-live="polite">{copyStatus}</p>
<p class="action-status" role="status" aria-live="polite">{exportStatus}</p>
<div
  class:visible={manualFallback}
  class="manual-copy-source"
  aria-hidden={!manualFallback}
>
  <p>Copy the selected {fallbackLabel} output manually:</p>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (visible manual-copy source is scrollable) -->
  <pre tabindex={manualFallback ? 0 : -1}><code bind:this={fallbackSource}
      >{fallbackCode}</code
    ></pre>
</div>

<style>
  :global(.output-surface) {
    padding: 1rem 1.1rem;
  }

  .panel-heading,
  .output-actions,
  .tab-list {
    display: flex;
  }

  .panel-heading {
    align-items: start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: 0.6rem;
  }

  .panel-heading h2,
  .panel-heading p,
  .output-note,
  .action-status,
  .unsupported p {
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

  .output-actions {
    flex-wrap: wrap;
    gap: 0.45rem;
    justify-content: end;
  }

  .output-note,
  .action-status {
    padding-block: 0.55rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .output-note.blocked,
  .unsupported {
    color: #9b2c20;
  }

  .output-tabs {
    margin-top: 0.35rem;
    border: 1px solid var(--line);
    border-radius: 0.45rem;
    overflow: hidden;
  }

  .tab-list {
    max-width: 100%;
    overflow-x: auto;
    border-bottom: 1px solid var(--line);
    background: var(--wash);
  }

  .tab-list button {
    flex: 0 0 auto;
    min-height: 44px;
    border: 0;
    border-bottom: 2px solid transparent;
    padding: 0.55rem 0.85rem;
    background: transparent;
    color: var(--muted);
    font: 650 0.82rem/1 var(--body-font);
    cursor: pointer;
  }

  .tab-list button.active {
    border-bottom-color: var(--accent);
    color: var(--ink);
  }

  pre {
    max-height: 28rem;
    margin: 0;
    overflow: auto;
    padding: 1rem 1.1rem;
    background: var(--code-paper);
    color: var(--code-ink);
    font: 0.78rem/1.55 var(--mono-font);
    white-space: pre;
  }

  .unsupported {
    min-height: 12rem;
    padding: 1rem;
    background: color-mix(in srgb, #b42318 6%, var(--paper));
  }

  .unsupported p {
    margin-top: 0.5rem;
    color: var(--muted);
    font-size: 0.82rem;
  }

  .manual-copy-source {
    position: fixed;
    left: -200vw;
    width: min(32rem, calc(100vw - 2rem));
  }

  .manual-copy-source.visible {
    position: static;
    margin-top: 0.75rem;
  }

  .manual-copy-source p {
    margin: 0 0 0.5rem;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .manual-copy-source pre {
    max-height: 12rem;
  }

  @media (max-width: 47.99rem) {
    :global(.output-surface) {
      padding: 0.85rem 0.75rem;
    }

    .panel-heading {
      display: grid;
    }

    .output-actions {
      justify-content: start;
    }

    pre {
      max-height: 22rem;
    }
  }
</style>
