<script lang="ts">
  import { onMount } from "svelte";

  import { briefCopyStatus, COPIED_STATUS, copyText } from "$lib/clipboard";
  import { CHECK_ICON_SVG, COPY_ICON_SVG } from "$lib/copy-icons";
  import { loadHighlight, type HighlightBundle } from "$lib/load-highlight";

  const {
    code,
    language = "",
    /** @deprecated Prefer `accessibleLabel`. Kept as an aria-label alias. */
    label,
    accessibleLabel = label ?? "Copy code",
    class: className = "",
  }: {
    code: string;
    language?: string;
    label?: string;
    accessibleLabel?: string;
    class?: string;
  } = $props();

  let source = $state<HTMLElement>();
  let status = $state("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let bundle = $state<HighlightBundle | null>(null);
  const Highlight = $derived(bundle?.Highlight ?? null);
  const languageModule = $derived(
    bundle === null ? null : bundle.resolveCodeLanguage(language),
  );
  const copied = $derived(status === COPIED_STATUS);

  onMount(() => {
    let cancelled = false;
    void loadHighlight().then((loaded) => {
      if (!cancelled) bundle = loaded;
    });
    return () => {
      cancelled = true;
    };
  });

  async function copy(): Promise<void> {
    if (timer !== undefined) clearTimeout(timer);
    if (source === undefined) return;
    const result = await copyText(code, source);
    status = briefCopyStatus(result);
    if (result === "copied") timer = setTimeout(() => (status = ""), 2000);
  }
</script>

<div class={`copy-code ${className}`}>
  <button
    type="button"
    class="copy-trigger"
    aria-label={copied ? "Copied" : accessibleLabel}
    onclick={copy}
  >
    {#if copied}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static SVG -->
      {@html CHECK_ICON_SVG}
    {:else}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- trusted static SVG -->
      {@html COPY_ICON_SVG}
    {/if}
  </button>
  <!--
    Stable selection target for the clipboard-unavailable path. Highlight swaps
    its DOM after mount; selecting the display tree races and leaves an empty
    selection (docs-home-gallery manual-copy journey).
  -->
  <pre class="copy-source" bind:this={source} aria-hidden="true">{code}</pre>
  <div class="code-body">
    {#if Highlight !== null && languageModule !== null}
      <Highlight {code} language={languageModule} />
    {:else}
      <pre><code>{code}</code></pre>
    {/if}
  </div>
  <span class="visually-hidden" role="status">{status}</span>
</div>

<style>
  .copy-code {
    position: relative;
    /* Fit the snippet; cap at the parent so long pre lines scroll inside
       .code-body and the absolute copy trigger stays on-card. */
    width: fit-content;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 2px;
    background: var(--code-paper);
    color: var(--code-ink);
  }

  .copy-trigger {
    position: absolute;
    z-index: 1;
    top: 0.45rem;
    right: 0.45rem;
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    min-width: 2.5rem;
    min-height: 2.5rem;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--code-ink) 28%, transparent);
    border-radius: 2px;
    background: color-mix(in srgb, var(--code-paper) 88%, transparent);
    color: var(--code-ink);
    cursor: pointer;
  }

  .copy-trigger:hover {
    border-color: color-mix(in srgb, var(--code-ink) 55%, transparent);
    background: color-mix(in srgb, var(--code-paper) 70%, var(--code-ink) 8%);
  }

  .copy-source {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: pre;
    border: 0;
  }

  .code-body {
    min-width: 0;
    overflow-x: auto;
  }

  .code-body :global(pre.hljs),
  .code-body :global(pre) {
    margin: 0;
    padding: 0.85rem 3.25rem 0.85rem 1rem;
    background: transparent !important;
    color: inherit;
    font-family: var(--code-font);
    font-size: 0.85rem;
    line-height: 1.55;
  }

  .code-body :global(code.hljs),
  .code-body :global(code) {
    background: transparent !important;
    font-family: inherit;
  }
</style>
