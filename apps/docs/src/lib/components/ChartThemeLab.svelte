<script lang="ts">
  import { GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";
  import { onMount } from "svelte";

  import { THEME_OPTIONS } from "$lib/catalog/themes";
  import CopyCode from "$lib/components/CopyCode.svelte";

  const rows = [
    { quarter: 1, value: 24, group: "Observed" },
    { quarter: 2, value: 38, group: "Observed" },
    { quarter: 3, value: 45, group: "Observed" },
    { quarter: 4, value: 63, group: "Observed" },
    { quarter: 1, value: 31, group: "Expected" },
    { quarter: 2, value: 41, group: "Expected" },
    { quarter: 3, value: 54, group: "Expected" },
    { quarter: 4, value: 70, group: "Expected" },
  ];

  let explicitTheme = $state<ThemeName>("default");
  let followDocs = $state(false);
  let siteAppearance = $state<"light" | "dark">("light");
  const resolvedTheme = $derived<ThemeName>(
    followDocs ? siteAppearance : explicitTheme,
  );
  const scheme = $derived(
    THEME_OPTIONS.find((theme) => theme.name === resolvedTheme)?.scheme ??
      "observable10",
  );
  const code = $derived(
    `<GGPlot
  data={rows}
  aes={{ x: "quarter", y: "value", color: "group" }}
  theme="${resolvedTheme}"
  scales={{ color: { scheme: "${scheme}" } }}
>
  <GeomPoint size={4} />
</GGPlot>`,
  );

  function syncSiteAppearance(): void {
    siteAppearance =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  }

  function changeFollow(event: Event): void {
    followDocs = (event.currentTarget as HTMLInputElement).checked;
    if (followDocs) syncSiteAppearance();
  }

  onMount(() => {
    syncSiteAppearance();
    const observer = new MutationObserver(() => {
      if (followDocs) syncSiteAppearance();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  });
</script>

<section class="theme-lab" aria-label="Chart theme lab">
  <div class="lab-output">
    <GGPlot
      data={rows}
      aes={{ x: "quarter", y: "value", color: "group" }}
      theme={resolvedTheme}
      scales={{ color: { type: "ordinal", scheme } }}
      height={360}
      ariaLabel={`${resolvedTheme} chart theme`}
    >
      <GeomPoint size={4} />
    </GGPlot>
    <CopyCode
      {code}
      language="svelte"
      accessibleLabel="Copy selected theme code"
    />
  </div>

  <div class="lab-copy">
    <p class="eyebrow">Live</p>
    <h2>Pick a theme</h2>
    <p>
      <code>theme</code> is set on the plot. Site appearance is separate unless you
      wire them yourself.
    </p>
    <div class="controls">
      <div class="select-control">
        <label for="chart-theme">Chart theme</label>
        <select
          id="chart-theme"
          bind:value={explicitTheme}
          disabled={followDocs}
        >
          {#each THEME_OPTIONS as theme (theme.name)}
            <option value={theme.name}>{theme.label}</option>
          {/each}
        </select>
      </div>
      <label class="follow-control">
        <input type="checkbox" checked={followDocs} onchange={changeFollow} />
        <span>Follow docs appearance</span>
      </label>
    </div>
    <p class="resolved" role="status">
      theme="{resolvedTheme}"{followDocs ? " · following docs" : ""}
    </p>
  </div>
</section>

<style>
  .theme-lab {
    display: grid;
    grid-template-columns: minmax(0, 1.35fr) minmax(0, 0.65fr);
    gap: clamp(1.5rem, 4vw, 3rem);
    align-items: start;
    min-width: 0;
    padding-block: clamp(1.5rem, 4vw, 2.5rem) clamp(2.5rem, 6vw, 4rem);
  }

  .eyebrow {
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    margin: 0.25rem 0 0.65rem;
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.05;
    letter-spacing: -0.02em;
  }

  .lab-copy {
    min-width: 0;
  }

  .lab-copy > p:not(.eyebrow, .resolved) {
    margin: 0;
    max-width: 28rem;
    color: var(--muted);
  }

  .controls {
    display: grid;
    gap: 0.85rem;
    margin-top: 1.5rem;
  }

  .select-control {
    display: grid;
    gap: 0.4rem;
    font-size: 0.82rem;
    font-weight: 650;
  }

  select {
    width: 100%;
    min-height: 44px;
    padding: 0.6rem 2.5rem 0.6rem 0.75rem;
    border: 1px solid var(--line-strong, var(--line));
    border-radius: 2px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }

  .follow-control {
    display: flex;
    gap: 0.65rem;
    align-items: center;
    min-height: 44px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .follow-control input {
    width: 1.15rem;
    height: 1.15rem;
  }

  .resolved {
    min-height: 1.5rem;
    margin: 0.75rem 0 0;
    color: var(--muted);
    font-size: 0.82rem;
    font-family: var(--code-font);
  }

  .lab-output {
    display: grid;
    gap: 0.75rem;
    min-width: 0;
  }

  @media (max-width: 50rem) {
    .theme-lab {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }

    .lab-output {
      grid-row: 1;
    }
  }
</style>
