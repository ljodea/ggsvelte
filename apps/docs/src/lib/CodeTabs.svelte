<script lang="ts">
  /**
   * The code triptych (plan: "docs triptych"): the same plot as canonical
   * spec JSON (what agents emit), fluent-builder TypeScript (spec.ts), and
   * idiomatic Svelte components (Example.svelte) — each with a copy button.
   */
  interface Tab {
    label: string;
    code: string;
  }

  const { tabs }: { tabs: Tab[] } = $props();

  let active = $state(0);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function copy(): Promise<void> {
    const code = tabs[active]?.code ?? "";
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => {
        copied = false;
      }, 1500);
    } catch {
      // Clipboard unavailable (permissions/insecure context): quietly no-op.
    }
  }

  function select(i: number): void {
    active = i;
    copied = false;
  }
</script>

<div class="code-tabs">
  <div class="bar" role="tablist" aria-label="Code representations">
    {#each tabs as tab, i (tab.label)}
      <button
        type="button"
        role="tab"
        aria-selected={i === active}
        class:active={i === active}
        onclick={() => {
          select(i);
        }}
      >
        {tab.label}
      </button>
    {/each}
    <button type="button" class="copy" onclick={copy}>
      {copied ? "Copied!" : "Copy"}
    </button>
  </div>
  <pre><code>{tabs[active]?.code ?? ""}</code></pre>
</div>

<style>
  .code-tabs {
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    margin: 1.5rem 0;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.4rem 0.6rem;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
  }

  .bar button {
    font: inherit;
    font-size: 0.85rem;
    padding: 0.25rem 0.7rem;
    border: 1px solid transparent;
    border-radius: 6px;
    background: none;
    color: var(--muted);
    cursor: pointer;
  }

  .bar button.active {
    color: var(--fg);
    border-color: var(--border);
    background: var(--bg);
  }

  .bar .copy {
    margin-left: auto;
    color: var(--accent);
  }

  pre {
    margin: 0;
    padding: 1rem;
    overflow-x: auto;
    font-size: 0.8rem;
    line-height: 1.5;
  }
</style>
