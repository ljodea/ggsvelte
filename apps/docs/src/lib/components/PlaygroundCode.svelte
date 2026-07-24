<script lang="ts">
  import { base } from "$app/paths";
  import { tick } from "svelte";

  import CodeTabs from "$lib/CodeTabs.svelte";
  import UiButton from "$lib/components/UiButton.svelte";
  import { copyText } from "$lib/clipboard";
  import { playgroundSVGExport } from "$lib/playground-export";
  import type { PlaygroundOutput } from "$lib/playground-output";
  import {
    PLAYGROUND_SVG_DOWNLOADED_STATUS,
    playgroundShareCopyStatus,
    playgroundSvgDownloadFailureStatus,
    playgroundSvgExportFailureStatus,
  } from "$lib/playground-output-status";
  import type { PortableSpec } from "@ggsvelte/spec";

  const {
    outputs,
    rendered,
    enabled,
    getHandoffText,
    onShare,
    shareStatus = "",
  }: {
    outputs: readonly PlaygroundOutput[];
    rendered: PortableSpec;
    enabled: boolean;
    /** Lazy — the ~10KB prompt is assembled only when the user copies it. */
    getHandoffText: () => string;
    onShare: () => void;
    shareStatus?: string;
  } = $props();

  let exportStatus = $state("");
  let handoffStatus = $state("");
  let handoffSource = $state<HTMLElement>();

  const tabs = $derived(
    outputs
      .filter((output) => output.supported)
      .map((output) => ({
        label: output.label,
        code: output.code,
        language:
          output.kind === "svelte"
            ? "svelte"
            : output.kind === "builder"
              ? "typescript"
              : "json",
      })),
  );

  const specTabActiveNote =
    "This is the portable spec — the JSON contract AI agents use to create and edit ggsvelte charts. Validated by /schema/v0.json.";

  function downloadSvg(): void {
    if (!enabled) return;
    const result = playgroundSVGExport(rendered);
    if (!result.ok) {
      exportStatus = playgroundSvgExportFailureStatus(result.diagnostic);
      return;
    }
    try {
      const blob = new Blob([result.svg], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      exportStatus = PLAYGROUND_SVG_DOWNLOADED_STATUS;
    } catch (error) {
      exportStatus = playgroundSvgDownloadFailureStatus(error);
    }
  }

  async function copyHandoff(): Promise<void> {
    await tick();
    if (handoffSource === undefined) return;
    const result = await copyText(getHandoffText(), handoffSource);
    handoffStatus = playgroundShareCopyStatus(result);
  }
</script>

<section class="code-section" aria-labelledby="playground-code-heading">
  <h2 id="playground-code-heading" class="section-heading">
    Use this chart in your app
  </h2>

  <p class="install-hint">
    <code>bun add @ggsvelte/svelte</code>
    ·
    <a href={`${base}/guide/getting-started`}>Getting Started</a>
    · Svelte 5 component — drop into any <code>.svelte</code> file
  </p>
  <p class="byo-line">
    Using your own data? Set <code>data.values</code> to your rows and map your
    columns in
    <code>aes</code>.
  </p>

  {#if tabs.length > 0}
    <CodeTabs {tabs} />
  {/if}

  <p class="spec-caption">{specTabActiveNote}</p>

  <div class="actions">
    <UiButton type="button" onclick={downloadSvg} disabled={!enabled}>
      Download SVG
    </UiButton>
    <button
      type="button"
      class="text-link"
      onclick={onShare}
      disabled={!enabled}
    >
      Share this chart
    </button>
    <span class="status" role="status" aria-live="polite"
      >{exportStatus || shareStatus}</span
    >
  </div>

  <p class="handoff">
    Building with an AI agent?
    <button
      type="button"
      class="text-link"
      onclick={copyHandoff}
      bind:this={handoffSource}
    >
      Copy a ready-made prompt
    </button>
    ·
    <a href={`${base}/llms.txt`}>llms.txt</a>
    <span class="status" role="status" aria-live="polite">{handoffStatus}</span>
  </p>
</section>

<style>
  .code-section {
    display: grid;
    gap: 0.75rem;
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--line);
  }

  .section-heading {
    margin: 0;
    font-size: 1.15rem;
    letter-spacing: -0.02em;
  }

  .install-hint,
  .byo-line,
  .spec-caption,
  .handoff {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  .install-hint code,
  .byo-line code {
    font-family: var(--code-font);
    font-size: 0.85em;
  }

  .spec-caption {
    font-size: 0.8rem;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem 1rem;
  }

  .text-link {
    appearance: none;
    border: 0;
    background: none;
    display: inline-flex;
    align-items: center;
    padding: 0.35rem 0.1rem;
    min-height: 44px;
    color: var(--accent);
    font: inherit;
    cursor: pointer;
  }

  .text-link:hover {
    text-decoration: underline;
  }

  .text-link:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    text-decoration: none;
  }

  .status {
    color: var(--muted);
    font-size: 0.8rem;
  }

  .handoff a {
    color: var(--accent);
  }
</style>
