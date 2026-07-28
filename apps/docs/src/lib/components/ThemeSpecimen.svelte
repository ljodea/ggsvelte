<script lang="ts">
  import { onMount } from "svelte";
  import type { ThemeName } from "@ggsvelte/spec";

  import { observeNearViewport } from "$lib/near-viewport";
  import type {
    SchemeName,
    ThemeSpecimenKind,
  } from "$lib/theme-specimens/catalog";

  const {
    name,
    label,
    caption,
    kind,
    scheme,
    legendFocus,
    staticSvg,
    eager = false,
  }: {
    name: ThemeName;
    label: string;
    caption: string;
    kind: ThemeSpecimenKind;
    scheme: SchemeName;
    legendFocus: boolean;
    /** Prerendered SVG shell (no client core import). */
    staticSvg: string;
    /** When true, upgrade to interactive immediately on mount (above-fold). */
    eager?: boolean;
  } = $props();

  const plotHeight = 380;

  let host = $state<HTMLDivElement | null>(null);
  let Live = $state<typeof import("./ThemeSpecimenLive.svelte").default | null>(
    null,
  );

  onMount(() => {
    const el = host;
    if (el === null) return;
    let cancelled = false;

    const load = (): void => {
      if (cancelled || Live !== null) return;
      void import("./ThemeSpecimenLive.svelte").then((mod) => {
        if (!cancelled) Live = mod.default;
      });
    };

    if (eager) {
      load();
      return () => {
        cancelled = true;
      };
    }

    const stop = observeNearViewport(el, load, { rootMargin: "480px 0px" });
    return () => {
      cancelled = true;
      stop();
    };
  });
</script>

<article class="specimen">
  <header>
    <h3>{label}</h3>
    <p class="caption">{caption}</p>
  </header>

  <div class="plot-panel" bind:this={host} style:min-height="{plotHeight}px">
    {#if Live !== null}
      <Live {name} {label} {kind} {scheme} {legendFocus} height={plotHeight} />
    {:else}
      {@html staticSvg}
    {/if}
  </div>
</article>

<style>
  .specimen {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }

  header {
    min-width: 0;
  }

  h3 {
    margin: 0;
    font-size: 1.25rem;
    letter-spacing: -0.01em;
  }

  .caption {
    margin: 0.25rem 0 0;
    max-width: 40rem;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.4;
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
</style>
