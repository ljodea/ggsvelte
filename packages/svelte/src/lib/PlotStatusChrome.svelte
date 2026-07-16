<script lang="ts">
  /**
   * Status / a11y chrome for GGPlot (sr-only instructions, live region,
   * empty state, capability status). Host owns interaction state and text.
   *
   * Element ids stay plot-scoped so capture `aria-describedby` and live
   * region wiring remain stable across extraction.
   */
  const {
    plotId,
    showInstructions = false,
    activeDatumLabel = "No active datum",
    showAreaInstruction = false,
    showLiveRegion = false,
    liveText = "",
    emptyPlot = false,
    capabilityStatus = null,
  }: {
    plotId: string;
    /** When true, render description + active datum sr-only pair. */
    showInstructions?: boolean;
    activeDatumLabel?: string;
    showAreaInstruction?: boolean;
    showLiveRegion?: boolean;
    liveText?: string;
    emptyPlot?: boolean;
    capabilityStatus?: string | null;
  } = $props();
</script>

{#if showInstructions}
  <p id={`${plotId}-description`} class="gg-sr-only">
    Use arrow keys to inspect data. Press Enter to pin. Press Escape to dismiss.
  </p>
  <p id={`${plotId}-active`} class="gg-sr-only">
    {activeDatumLabel}
  </p>
{/if}
{#if showAreaInstruction}
  <p class="gg-area-instruction">Choose opposite corner</p>
{/if}
{#if showLiveRegion}
  <div
    id={`${plotId}-live`}
    class="gg-sr-only"
    aria-live="polite"
    aria-atomic="true"
  >
    {liveText}
  </div>
{/if}
{#if emptyPlot}
  <div class="gg-empty-state" role="status">No data to display</div>
{/if}
{#if capabilityStatus !== null}
  <p class="gg-capability-status" role="status">{capabilityStatus}</p>
{/if}

<style>
  .gg-area-instruction {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 2;
    margin: 0;
    border-radius: 3px;
    padding: 4px 7px;
    background: var(--gg-tooltipBg, var(--gg-theme-tooltipBg, #fff));
    color: var(--gg-foreground, var(--gg-theme-foreground, currentColor));
    font-size: 13px;
    line-height: 1.25;
    pointer-events: none;
  }

  .gg-empty-state {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: var(
      --gg-interactionMuted,
      var(--gg-theme-interactionMuted, currentColor)
    );
    font: 12px/1.4 var(--gg-font-family, sans-serif);
    pointer-events: none;
  }

  .gg-capability-status {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    margin: 0;
    color: var(
      --gg-interactionMuted,
      var(--gg-theme-interactionMuted, currentColor)
    );
    font: 11px/1.4 var(--gg-font-family, sans-serif);
  }

  /* sr-only pattern (NOT display:none — must stay in the a11y tree). */
  .gg-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* Mirrors GGPlot root reduced-motion policy for this component scope
     (parent `.gg-plot-root *` cannot cross Svelte style boundaries). */
  @media (prefers-reduced-motion: reduce) {
    .gg-area-instruction,
    .gg-empty-state,
    .gg-capability-status,
    .gg-sr-only {
      scroll-behavior: auto;
      transition: none !important;
      animation: none !important;
    }
  }
</style>
