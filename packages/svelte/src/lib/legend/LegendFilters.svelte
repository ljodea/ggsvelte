<script lang="ts">
  /**
   * Discrete legend-filter fieldset for GGPlot.
   * Host owns the controller + entries derived; this child owns markup, the
   * reset-focus microtask, and fieldset-scoped styles (root layout margins
   * stay on the plot root).
   */
  import { encodeKey } from "@ggsvelte/core";

  import type {
    FilterableLegendEntry,
    LegendFilterState,
  } from "./filter-state.svelte.js";

  const {
    controller,
    entries,
    /** When legend-focus clear is also active, fieldset sits on a second row. */
    belowClearFocus = false,
  }: {
    controller: LegendFilterState;
    entries: readonly FilterableLegendEntry[];
    belowClearFocus?: boolean;
  } = $props();

  let fieldsetEl = $state<HTMLFieldSetElement | null>(null);

  function onReset(event: MouseEvent): void {
    // Mirror the controller's no-op guard: a reset with no active filters
    // must not move keyboard focus (original resetLegendFilters early-
    // returned before capturing the return target).
    if (!controller.hasActiveFilters) return;
    // Capture first checkbox before reset (which may unmount the button).
    // Controller retains zero DOM/querySelector behavior.
    const returnTarget = fieldsetEl?.querySelector<HTMLElement>("input");
    controller.reset(event);
    queueMicrotask(() => returnTarget?.focus());
  }
</script>

{#if entries.length > 0}
  <fieldset
    class="gg-legend-filters"
    class:gg-legend-filters-below-clear={belowClearFocus}
    bind:this={fieldsetEl}
  >
    <legend>Filter legend</legend>
    {#each entries as target (`${target.legend.scale}:${target.field}:${encodeKey(target.entry.value)}`)}
      <label>
        <input
          type="checkbox"
          checked={target.visible}
          aria-label={`Show ${target.entry.label}`}
          onpointerdown={(event) =>
            controller.setPointerType(event.pointerType)}
          onpointercancel={() => controller.setPointerType(null)}
          onclick={(event) => controller.toggle(target, event)}
        />
        <span>{target.entry.label}</span>
      </label>
    {/each}
    {#if controller.hasActiveFilters}
      <button
        type="button"
        aria-label="Reset legend filters"
        onpointerdown={(event) => controller.setPointerType(event.pointerType)}
        onpointercancel={() => controller.setPointerType(null)}
        onclick={onReset}>Reset</button
      >
    {/if}
  </fieldset>
{/if}

<style>
  .gg-legend-filters {
    position: absolute;
    top: calc(100% + 4px);
    left: 4px;
    z-index: 5;
    display: flex;
    min-height: 44px;
    max-width: calc(100% - 8px);
    margin: 0;
    padding: 0;
    border: 0;
    gap: 4px;
    align-items: center;
    overflow-x: auto;
    color: var(--gg-ink, var(--gg-theme-ink, currentColor));
    font: 11px/1.2 var(--gg-font-family, sans-serif);
    pointer-events: auto;
  }

  /* Parent root also has clear-focus: fieldset drops to the second control
     row so labels never cover the clear button (was a combined parent/child
     selector on GGPlot; prop variant keeps the rule child-scoped). */
  .gg-legend-filters-below-clear {
    top: calc(100% + 52px);
  }

  .gg-legend-filters legend {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .gg-legend-filters label,
  .gg-legend-filters button {
    display: inline-flex;
    min-height: 44px;
    margin: 0;
    padding: 0 8px;
    align-items: center;
    gap: 5px;
    border: 1px solid
      var(--gg-tooltipBorder, var(--gg-theme-tooltipBorder, currentColor));
    border-radius: 3px;
    background: var(
      --gg-tooltipPaper,
      var(
        --gg-tooltip-background,
        var(--gg-theme-tooltipPaper, var(--gg-paper, #fff))
      )
    );
    color: var(
      --gg-tooltipInk,
      var(
        --gg-tooltip-foreground,
        var(--gg-theme-tooltipInk, var(--gg-ink, #1f2328))
      )
    );
    font: inherit;
    white-space: nowrap;
  }

  .gg-legend-filters input {
    width: 18px;
    height: 18px;
    margin: 0;
  }

  .gg-legend-filters label:has(:focus-visible),
  .gg-legend-filters button:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }
</style>
