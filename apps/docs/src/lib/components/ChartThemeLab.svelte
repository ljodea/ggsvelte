<script lang="ts">
  import { GeomLine, GeomPoint, GGPlot } from "@ggsvelte/svelte";
  import type { ThemeName } from "@ggsvelte/spec";
  import { onMount } from "svelte";

  import { CATEGORICAL_PALETTES, THEME_OPTIONS } from "$lib/catalog/themes";
  import CopyCode from "$lib/components/CopyCode.svelte";
  import {
    readDocsAppearance,
    watchDocsAppearance,
    type DocsAppearance,
  } from "$lib/docs-appearance";
  import { MONTH_BREAKS } from "$lib/theme-specimens/catalog";
  import { temperaturesKeyed } from "$lib/theme-specimens/data";
  import { heroThemePaletteSnippet } from "$lib/theme-specimens/snippets";

  type SchemeName = (typeof CATEGORICAL_PALETTES)[number]["name"];

  let explicitTheme = $state<ThemeName>("default");
  let scheme = $state<SchemeName>("observable10");
  let followDocs = $state(false);
  let siteAppearance = $state<DocsAppearance>("light");

  const resolvedTheme = $derived<ThemeName>(
    followDocs ? siteAppearance : explicitTheme,
  );

  const code = $derived(heroThemePaletteSnippet(resolvedTheme, scheme));

  const statusText = $derived(
    followDocs
      ? `theme follows site appearance (${siteAppearance}) · scheme="${scheme}" remains yours`
      : `theme="${resolvedTheme}" · scheme="${scheme}"`,
  );

  function syncSiteAppearance(): void {
    siteAppearance = readDocsAppearance();
  }

  function changeFollow(event: Event): void {
    followDocs = (event.currentTarget as HTMLInputElement).checked;
    if (followDocs) syncSiteAppearance();
  }

  onMount(() => {
    syncSiteAppearance();
    return watchDocsAppearance((appearance) => {
      if (followDocs) siteAppearance = appearance;
    });
  });
</script>

<section class="theme-lab" aria-label="Chart theme and palette lab">
  <p class="eyebrow">Live</p>
  <h2>Try theme and palette</h2>
  <p class="lede">
    <code>theme</code> styles paper, grid, axes, and type.
    <code>scales.color.scheme</code> colors series. Docs light/dark only applies when
    Follow docs appearance is on.
  </p>

  <div class="plot-panel">
    <GGPlot
      data={temperaturesKeyed}
      aes={{ x: "month", y: "temp", color: "city" }}
      theme={resolvedTheme}
      scales={{
        x: { breaks: [...MONTH_BREAKS] },
        color: { type: "ordinal", scheme },
      }}
      labs={{
        title: "Monthly mean temperature",
        x: "Month",
        y: "Temperature (°C)",
        color: "City",
      }}
      key="id"
      inspect={{ mode: "x" }}
      legendFocus
      height={400}
      ariaLabel={`${resolvedTheme} theme with ${scheme} palette`}
    >
      <GeomLine linewidth={2} />
      <GeomPoint size={2.5} />
    </GGPlot>
  </div>

  <div class="controls">
    <div class="select-control">
      <label for="chart-theme">Chart theme</label>
      <select id="chart-theme" bind:value={explicitTheme} disabled={followDocs}>
        {#each THEME_OPTIONS as theme (theme.name)}
          <option value={theme.name}>{theme.label}</option>
        {/each}
      </select>
    </div>
    <div class="select-control">
      <label for="chart-palette">Categorical palette</label>
      <select id="chart-palette" bind:value={scheme}>
        {#each CATEGORICAL_PALETTES as palette (palette.name)}
          <option value={palette.name}>{palette.label}</option>
        {/each}
      </select>
    </div>
    <label class="follow-control">
      <input type="checkbox" checked={followDocs} onchange={changeFollow} />
      <span>Follow docs appearance</span>
    </label>
  </div>

  <p class="resolved" role="status">{statusText}</p>

  <div class="code-footer">
    <CopyCode
      {code}
      language="svelte"
      accessibleLabel="Copy selected theme and palette code"
    />
  </div>
</section>

<style>
  .theme-lab {
    display: grid;
    gap: 0.85rem;
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
    margin: 0;
    font-size: clamp(1.5rem, 3vw, 2rem);
    line-height: 1.05;
    letter-spacing: -0.02em;
  }

  .lede {
    margin: 0;
    max-width: 40rem;
    color: var(--muted);
    font-size: 0.98rem;
    line-height: 1.45;
  }

  .lede code {
    font-size: 0.9em;
  }

  .plot-panel {
    width: min(100%, 52rem);
    min-width: 0;
    margin-top: 0.5rem;
  }

  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.85rem 1.25rem;
    align-items: end;
    width: min(100%, 52rem);
  }

  .select-control {
    display: grid;
    gap: 0.4rem;
    min-width: min(100%, 12rem);
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

  select:disabled {
    opacity: 0.55;
    cursor: not-allowed;
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
    margin: 0;
    width: min(100%, 52rem);
    color: var(--muted);
    font-size: 0.82rem;
    font-family: var(--code-font);
  }

  .code-footer {
    width: min(100%, 52rem);
    min-width: 0;
  }
</style>
