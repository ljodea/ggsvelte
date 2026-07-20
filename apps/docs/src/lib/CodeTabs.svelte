<script lang="ts">
  /**
   * The code triptych (plan: "docs triptych"): the same plot as canonical
   * spec JSON (what agents emit), fluent-builder TypeScript (spec.ts), and
   * idiomatic Svelte components (Example.svelte) — each with a copy button.
   */
  import { copyText, MANUAL_COPY_STATUS } from "$lib/clipboard";

  interface Tab {
    label: string;
    code: string;
  }

  const { tabs }: { tabs: Tab[] } = $props();

  let active = $state(0);
  let copyStatus = $state("");
  let codeNode = $state<HTMLElement>();
  const tabsetId = $props.id();
  const panelId = `${tabsetId}-panel`;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  async function copy(): Promise<void> {
    const code = tabs[active]?.code ?? "";
    if (codeNode === undefined) return;
    const result = await copyText(code, codeNode);
    clearTimeout(copyTimer);
    copyStatus = result === "copied" ? "Copied." : MANUAL_COPY_STATUS;
    if (result === "copied") {
      copyTimer = setTimeout(() => {
        copyStatus = "";
      }, 1500);
    }
  }

  function select(i: number): void {
    active = i;
    copyStatus = "";
  }

  function handleTabKey(event: KeyboardEvent, index: number): void {
    let next = index;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      next = (index + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      next = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    select(next);
    const target = event.currentTarget;
    if (!(target instanceof HTMLButtonElement)) return;
    const buttons =
      target.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }
</script>

<div class="code-tabs">
  <div class="bar">
    <div
      class="representations"
      role="tablist"
      aria-label="Code representations"
    >
      {#each tabs as tab, i (tab.label)}
        <button
          id={`${tabsetId}-tab-${String(i)}`}
          type="button"
          role="tab"
          aria-controls={panelId}
          aria-selected={i === active}
          tabindex={i === active ? 0 : -1}
          class:active={i === active}
          onclick={() => {
            select(i);
          }}
          onkeydown={(event) => {
            handleTabKey(event, i);
          }}
        >
          {tab.label}
        </button>
      {/each}
    </div>
    <button type="button" class="copy" onclick={copy}>
      {copyStatus === "Copied." ? "Copied" : "Copy"}
    </button>
    <span class="visually-hidden" role="status">{copyStatus}</span>
  </div>
  <div
    id={panelId}
    role="tabpanel"
    aria-labelledby={`${tabsetId}-tab-${String(active)}`}
  >
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable code must be keyboard reachable) -->
    <div
      class="scroll-region"
      role="region"
      aria-label="Code example"
      tabindex="0"
    >
      <pre><code bind:this={codeNode}>{tabs[active]?.code ?? ""}</code></pre>
    </div>
  </div>
</div>

<style>
  .code-tabs {
    min-width: 0;
    margin: 1.5rem 0;
    border-top: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
  }

  .bar {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 0.25rem;
    padding: 0 0.35rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg);
  }

  .representations {
    display: flex;
    min-width: 0;
    gap: 0.15rem;
    overflow-x: auto;
  }

  .bar button {
    min-height: 44px;
    flex: 0 0 auto;
    padding: 0.35rem 0.65rem;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    background: none;
    color: var(--muted);
    cursor: pointer;
    font: 600 0.82rem/1 var(--body-font);
  }

  .bar button.active {
    border-bottom-color: var(--accent);
    color: var(--fg);
  }

  .bar .copy {
    margin-left: auto;
    color: var(--accent);
  }

  .scroll-region {
    max-width: 100%;
    overflow-x: auto;
    background: var(--code-paper);
    color: var(--code-ink);
  }

  pre {
    min-width: max-content;
    margin: 0;
    padding: 1rem;
    font-size: 0.8rem;
    line-height: 1.5;
  }

  @media (max-width: 35rem) {
    .bar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .bar .copy {
      margin-left: 0;
    }
  }
</style>
