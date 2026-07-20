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
  const code = $derived(
    `<GGPlot data={rows} aes={{ x: "quarter", y: "value", color: "group" }} theme="${resolvedTheme}">\n  <GeomPoint size={4} />\n</GGPlot>`,
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
  <div class="lab-copy">
    <p class="eyebrow">Separate by default</p>
    <h2>Site appearance is not chart meaning.</h2>
    <p>
      Choose a chart theme independently so exported graphics keep their
      intended paper and ink. Follow the docs appearance only when that behavior
      is deliberate.
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
      Chart theme: <strong>{resolvedTheme}</strong>{followDocs
        ? " · following docs"
        : " · explicit"}
    </p>
  </div>

  <div class="lab-output">
    <div class="plot-paper">
      <GGPlot
        data={rows}
        aes={{ x: "quarter", y: "value", color: "group" }}
        theme={resolvedTheme}
        height={340}
        ariaLabel={`${resolvedTheme} chart theme comparison`}
      >
        <GeomPoint size={4} />
      </GGPlot>
    </div>
    <p class="fragment-label">Svelte fragment</p>
    <CopyCode {code} label="Copy selected theme code" />
  </div>
</section>

<style>
  .theme-lab {
    display: grid;
    grid-template-columns: minmax(17rem, 0.75fr) minmax(0, 1.25fr);
    gap: clamp(2rem, 7vw, 7rem);
    align-items: center;
    padding-block: clamp(4rem, 9vw, 8rem);
    border-top: 1px solid var(--line);
  }

  .eyebrow,
  .fragment-label {
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 650;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  h2 {
    max-width: 11ch;
    margin: 0.25rem 0 1rem;
    font-size: clamp(2.5rem, 5vw, 4.5rem);
    line-height: 0.95;
  }

  .lab-copy > p:not(.eyebrow, .resolved) {
    max-width: 34rem;
    color: var(--muted);
  }

  .controls {
    display: grid;
    gap: 0.85rem;
    margin-top: 2rem;
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
    border: 1px solid var(--line-strong);
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
    color: var(--muted);
    font-size: 0.82rem;
  }

  .lab-output {
    min-width: 0;
    border: 1px solid var(--line);
    background: var(--paper);
  }

  .plot-paper {
    min-width: 0;
    overflow: hidden;
    border-bottom: 1px solid var(--line);
  }

  .fragment-label {
    padding: 0.8rem 1rem 0;
  }

  :global(.copy-code) {
    margin: 0.5rem 1rem 1rem;
  }

  @media (max-width: 50rem) {
    .theme-lab {
      grid-template-columns: 1fr;
      gap: 2rem;
    }

    .lab-output {
      grid-row: 1;
    }
  }
</style>
