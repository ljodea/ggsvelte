<script lang="ts">
  import { copyText, MANUAL_COPY_STATUS } from "$lib/clipboard";

  const {
    code,
    label = "Copy",
    accessibleLabel = label,
    class: className = "",
  }: {
    code: string;
    label?: string;
    accessibleLabel?: string;
    class?: string;
  } = $props();
  let source = $state<HTMLElement>();
  let status = $state("");
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function copy(): Promise<void> {
    if (timer !== undefined) clearTimeout(timer);
    if (source === undefined) return;
    const result = await copyText(code, source);
    status = result === "copied" ? "Copied." : MANUAL_COPY_STATUS;
    if (result === "copied") timer = setTimeout(() => (status = ""), 2000);
  }
</script>

<div class={`copy-code ${className}`}>
  <button type="button" aria-label={accessibleLabel} onclick={copy}
    >{status === "Copied." ? "Copied" : label}</button
  >
  <code bind:this={source}>{code}</code>
  <span class="visually-hidden" role="status">{status}</span>
</div>

<style>
  .copy-code {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: stretch;
    border: 1px solid var(--line);
    border-radius: 2px;
    background: var(--code-paper);
    color: var(--code-ink);
  }

  code {
    grid-column: 1;
    grid-row: 1;
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 0.75rem 1rem;
    overflow-x: auto;
    white-space: nowrap;
  }

  button {
    grid-column: 2;
    grid-row: 1;
    min-width: 5.5rem;
    min-height: 44px;
    border: 0;
    border-left: 1px solid currentColor;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: 600 0.82rem/1 var(--body-font);
    cursor: pointer;
  }
</style>
