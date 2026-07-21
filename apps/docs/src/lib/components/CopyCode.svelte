<script lang="ts">
  import CheckIcon from "phosphor-svelte/lib/CheckIcon";
  import CopyIcon from "phosphor-svelte/lib/CopyIcon";
  import Highlight from "svelte-highlight";

  import { copyText, MANUAL_COPY_STATUS } from "$lib/clipboard";
  import { resolveCodeLanguage } from "$lib/code-languages";

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
  const languageModule = $derived(resolveCodeLanguage(language));
  const copied = $derived(status === "Copied.");

  async function copy(): Promise<void> {
    if (timer !== undefined) clearTimeout(timer);
    if (source === undefined) return;
    const result = await copyText(code, source);
    status = result === "copied" ? "Copied." : MANUAL_COPY_STATUS;
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
      <CheckIcon size={18} weight="bold" aria-hidden="true" />
    {:else}
      <CopyIcon size={18} weight="regular" aria-hidden="true" />
    {/if}
  </button>
  <div class="code-body" bind:this={source}>
    <Highlight {code} language={languageModule} />
  </div>
  <span class="visually-hidden" role="status">{status}</span>
</div>

<style>
  .copy-code {
    position: relative;
    max-width: 100%;
    min-width: 0;
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
