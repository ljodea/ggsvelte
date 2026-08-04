<script lang="ts">
  import { briefCopyStatus, COPIED_STATUS, copyText } from "$lib/clipboard";
  import { highlightDocsBlock } from "$lib/code-languages";
  import { CHECK_ICON_SVG, COPY_ICON_SVG } from "$lib/copy-icons";

  const {
    code,
    language = "",
    /** Optional header-bar title (file name or label), bun.com style. */
    title,
    /** @deprecated Prefer `accessibleLabel`. Kept as an aria-label alias. */
    label,
    accessibleLabel = label ?? "Copy code",
    class: className = "",
  }: {
    code: string;
    language?: string;
    title?: string;
    label?: string;
    accessibleLabel?: string;
    class?: string;
  } = $props();

  let source = $state<HTMLElement>();
  let status = $state("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const highlighted = $derived(highlightDocsBlock(code, language));
  const copied = $derived(status === COPIED_STATUS);

  async function copy(): Promise<void> {
    if (timer !== undefined) clearTimeout(timer);
    if (source === undefined) return;
    const result = await copyText(code, source);
    status = briefCopyStatus(result);
    if (result === "copied") timer = setTimeout(() => (status = ""), 2000);
  }
</script>

<div class={`copy-code ${className}`} class:titled={title !== undefined}>
  {#if title !== undefined}
    <div class="copy-header">
      <span class="copy-title">{title}</span>
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
    </div>
  {:else}
    <button
      type="button"
      class="copy-trigger floating"
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
  {/if}
  <div class="code-body" bind:this={source}>
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- highlight.js token spans; plaintext is escaped -->
    {@html highlighted}
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
    border: 1px solid color-mix(in srgb, var(--code-ink) 10%, transparent);
    border-radius: var(--code-radius);
    background: var(--code-paper);
    color: var(--code-ink);
  }

  /* Titled blocks read as a small window: header bar, divider, then code. */
  .copy-code.titled {
    width: 100%;
  }

  .copy-header {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.3rem 0.5rem 0.3rem 1rem;
    border-bottom: 1px solid
      color-mix(in srgb, var(--code-ink) 10%, transparent);
  }

  .copy-title {
    overflow: hidden;
    color: color-mix(in srgb, var(--code-ink) 55%, transparent);
    font-family: var(--code-font);
    font-size: 0.75rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .copy-trigger {
    position: relative; /* anchors the extended hit region */
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    min-width: 2rem;
    min-height: 2rem;
    padding: 0;
    border: 0;
    border-radius: var(--radius);
    background: transparent;
    color: color-mix(in srgb, var(--code-ink) 55%, transparent);
    cursor: pointer;
    transition:
      background-color 120ms ease,
      color 120ms ease;
  }

  /*
   * DESIGN.md: free-standing controls keep a 44px hit region even when the
   * visual footprint is smaller (bun-style ghost icon). The pseudo-element
   * extends the target without growing the hover wash.
   */
  .copy-trigger::after {
    content: "";
    position: absolute;
    inset: -6px;
  }

  .copy-trigger:hover {
    background: color-mix(in srgb, var(--code-ink) 12%, transparent);
    color: var(--code-ink);
  }

  .copy-trigger.floating {
    position: absolute;
    z-index: 1;
    top: 0.5rem;
    right: 0.5rem;
  }

  .code-body {
    min-width: 0;
    overflow-x: auto;
  }

  .code-body :global(pre.hljs),
  .code-body :global(pre) {
    margin: 0;
    padding: 0.9rem 2.75rem 0.9rem 1rem;
    background: transparent !important;
    color: inherit;
    font-family: var(--code-font);
    font-size: 0.85rem;
    line-height: 1.6;
  }

  .titled .code-body :global(pre.hljs),
  .titled .code-body :global(pre) {
    padding-right: 1rem;
  }

  .code-body :global(code.hljs),
  .code-body :global(code) {
    background: transparent !important;
    font-family: inherit;
  }
</style>
