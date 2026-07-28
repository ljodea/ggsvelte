<script lang="ts">
  import type { ThemeName } from "@ggsvelte/spec";
  import { onMount } from "svelte";

  import { CATEGORICAL_PALETTES, THEME_OPTIONS } from "$lib/catalog/themes";
  import {
    readDocsAppearance,
    watchDocsAppearance,
    type DocsAppearance,
  } from "$lib/docs-appearance";

  type SchemeName = (typeof CATEGORICAL_PALETTES)[number]["name"];

  const {
    initialStaticSvg,
  }: {
    /** Prerendered default-theme shell; live plot replaces it on mount. */
    initialStaticSvg: string;
  } = $props();

  let explicitTheme = $state<ThemeName>("default");
  let scheme = $state<SchemeName>("observable10");
  let followDocs = $state(false);
  let siteAppearance = $state<DocsAppearance>("light");
  let LiveTemps = $state<
    typeof import("./TemperaturesSpecimen.svelte").default | null
  >(null);

  const resolvedTheme = $derived<ThemeName>(
    followDocs ? siteAppearance : explicitTheme,
  );

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
    // Above-fold lab: static SVG first, then upgrade to interactive once.
    void import("./TemperaturesSpecimen.svelte").then((mod) => {
      LiveTemps = mod.default;
    });
    syncSiteAppearance();
    return watchDocsAppearance((appearance) => {
      if (followDocs) siteAppearance = appearance;
    });
  });
</script>

<section class="theme-lab" aria-label="Chart theme and palette lab">
  <div class="plot-panel">
    {#if LiveTemps !== null}
      <LiveTemps
        theme={resolvedTheme}
        {scheme}
        height={400}
        legendFocus={true}
        ariaLabel={`${resolvedTheme} theme with ${scheme} palette`}
      />
    {:else}
      {@html initialStaticSvg}
    {/if}
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
</section>

<style>
  .theme-lab {
    display: grid;
    gap: 0.85rem;
    min-width: 0;
    padding-block: clamp(1.5rem, 4vw, 2.5rem) clamp(2.5rem, 6vw, 4rem);
  }

  .plot-panel {
    width: min(100%, 52rem);
    min-width: 0;
  }

  .plot-panel :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
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
</style>
