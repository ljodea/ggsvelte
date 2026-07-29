<script lang="ts">
  /**
   * The code triptych (plan: "docs triptych"): the same plot as canonical
   * spec JSON (what agents emit), fluent-builder TypeScript (spec.ts), and
   * idiomatic Svelte components (Example.svelte) — each with a copy button.
   */
  import { onMount } from "svelte";

  import { briefCopyStatus, COPIED_STATUS, copyText } from "$lib/clipboard";
  import { CHECK_ICON_SVG, COPY_ICON_SVG } from "$lib/copy-icons";
  import { loadHighlight, type HighlightBundle } from "$lib/load-highlight";
  import { nextRovingTabIndex } from "$lib/tab-roving";

  interface Tab {
    label: string;
    code: string;
    language?: string;
  }

  const { tabs }: { tabs: Tab[] } = $props();

  let active = $state(0);
  let copyStatus = $state("");
  let codeNode = $state<HTMLElement>();
  const tabsetId = $props.id();
  const panelId = `${tabsetId}-panel`;
  let copyTimer: ReturnType<typeof setTimeout> | undefined;
  let bundle = $state<HighlightBundle | null>(null);

  const activeTab = $derived(tabs[active]);
  const Highlight = $derived(bundle?.Highlight ?? null);
  const languageModule = $derived(
    bundle === null
      ? null
      : bundle.resolveCodeLanguage(
          activeTab?.language ??
            bundle.languageFromCodeTabLabel(activeTab?.label),
        ),
  );
  const copied = $derived(copyStatus === COPIED_STATUS);

  onMount(() => {
    let cancelled = false;
    void loadHighlight()
      .then((loaded) => {
        if (!cancelled) bundle = loaded;
      })
      .catch(() => {
        // Keep plain pre/code; loadHighlight clears its cache for retry.
      });
    return () => {
      cancelled = true;
    };
  });

  async function copy(): Promise<void> {
    const code = tabs[active]?.code ?? "";
    if (codeNode === undefined) return;
    const result = await copyText(code, codeNode);
    clearTimeout(copyTimer);
    copyStatus = briefCopyStatus(result);
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
    const next = nextRovingTabIndex(event.key, index, tabs.length);
    if (next === null) return;
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
    <button
      type="button"
      class="copy"
      aria-label={copied ? "Copied" : "Copy code"}
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
    <span class="visually-hidden" role="status">{copyStatus}</span>
  </div>
  <div
    id={panelId}
    role="tabpanel"
    aria-labelledby={`${tabsetId}-tab-${String(active)}`}
  >
    <!-- Stable selection target — Highlight remounts must not clear manual copy. -->
    <pre
      class="copy-source"
      bind:this={codeNode}
      aria-hidden="true">{activeTab?.code ?? ""}</pre>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex (scrollable code must be keyboard reachable) -->
    <div
      class="scroll-region code-surface"
      role="region"
      aria-label="Code example"
      tabindex="0"
    >
      {#if Highlight !== null && languageModule !== null}
        <Highlight code={activeTab?.code ?? ""} language={languageModule} />
      {:else}
        <pre><code>{activeTab?.code ?? ""}</code></pre>
      {/if}
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

  .bar button[role="tab"] {
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

  .bar button[role="tab"].active {
    border-bottom-color: var(--accent);
    color: var(--fg);
  }

  .bar .copy {
    display: grid;
    place-items: center;
    width: 2.5rem;
    height: 2.5rem;
    min-width: 2.5rem;
    min-height: 2.5rem;
    margin-left: auto;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: none;
    color: var(--accent);
    cursor: pointer;
  }

  .bar .copy:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
  }

  /*
   * code-surface puts padding on the box; here the box is the scrollport.
   * Keep padding on the scrollable pre so inline-end gap survives horizontal
   * scroll (Blink/WebKit drop scrollport padding at the end of overflow).
   */
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

  .scroll-region {
    max-width: 100%;
    padding: 0;
  }

  .scroll-region :global(pre.hljs),
  .scroll-region :global(pre) {
    min-width: max-content;
    margin: 0;
    padding: 1rem;
    background: transparent !important;
    color: inherit;
    font: inherit;
  }

  .scroll-region :global(code.hljs),
  .scroll-region :global(code) {
    background: transparent !important;
    font: inherit;
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
