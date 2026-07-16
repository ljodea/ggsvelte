<script lang="ts">
  import type { InteractionTool, ZoomDomains } from "./interaction.js";

  const {
    availableTools,
    activeTool,
    ready,
    emptyPlot,
    narrow = false,
    zoomDomains = null,
    hasPointSelection = false,
    hasIntervalSelection = false,
    intervalAxes = [],
    zoomAxes = [],
    onChooseTool,
    onResetZoom,
    onClearPointSelection,
    onClearIntervalSelection,
    onClearCurrentInterval,
    onEditBounds,
  }: {
    availableTools: readonly InteractionTool[];
    activeTool: InteractionTool;
    ready: boolean;
    emptyPlot: boolean;
    narrow?: boolean;
    zoomDomains?: ZoomDomains | null;
    hasPointSelection?: boolean;
    hasIntervalSelection?: boolean;
    intervalAxes?: readonly ("x" | "y")[];
    zoomAxes?: readonly ("x" | "y")[];
    onChooseTool: (tool: InteractionTool) => void;
    onResetZoom: () => void;
    onClearPointSelection: () => void;
    onClearIntervalSelection: () => void;
    onClearCurrentInterval: () => void;
    onEditBounds: (
      action: "select" | "zoom",
      axis: "x" | "y",
      trigger: HTMLElement,
    ) => void;
  } = $props();

  function labelFor(tool: InteractionTool): string {
    if (tool === "select-area") return "Select area";
    if (tool === "zoom-area") return "Zoom area";
    if (tool === "point") return "Select point";
    return "Inspect";
  }
</script>

<div
  class="gg-tool-rail"
  class:gg-tool-rail-narrow={narrow}
  role="toolbar"
  aria-label="Chart interaction tools"
  aria-busy={!ready}
>
  <div class="gg-tool-modes">
    {#each availableTools as available (available)}
      <button
        type="button"
        disabled={!ready ||
          (emptyPlot &&
            (available === "select-area" || available === "zoom-area"))}
        class:active={activeTool === available}
        aria-pressed={activeTool === available}
        onclick={() => onChooseTool(available)}>{labelFor(available)}</button
      >
    {/each}
  </div>
  <div class="gg-tool-recovery-actions">
    {#if zoomDomains !== null}
      <button type="button" onclick={onResetZoom}>Reset zoom</button>
      {#each zoomAxes as axis (axis)}
        <button
          type="button"
          onclick={(event) => onEditBounds("zoom", axis, event.currentTarget)}
          >Edit {axis} zoom bounds</button
        >
      {/each}
    {/if}
    {#if hasPointSelection}
      <button type="button" onclick={onClearPointSelection}
        >Clear selection</button
      >
    {/if}
    {#if hasIntervalSelection}
      <button type="button" onclick={onClearCurrentInterval}
        >Clear panel selection</button
      >
      <button type="button" onclick={onClearIntervalSelection}
        >Clear all selections</button
      >
      {#each intervalAxes as axis (axis)}
        <button
          type="button"
          onclick={(event) => onEditBounds("select", axis, event.currentTarget)}
          >Edit {axis} selection bounds</button
        >
      {/each}
    {/if}
  </div>
</div>

<style>
  .gg-tool-rail {
    position: absolute;
    left: 8px;
    right: 8px;
    top: -48px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px;
    align-items: center;
    z-index: 1;
    line-height: 1.2;
    pointer-events: auto;
  }

  .gg-tool-modes,
  .gg-tool-recovery-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .gg-tool-rail button {
    min-height: 44px;
    min-width: 44px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0 10px;
    background: transparent;
    color: var(
      --gg-interactionMuted,
      var(--gg-theme-interactionMuted, currentColor)
    );
    font: inherit;
    font-size: 14px;
  }

  .gg-tool-rail button:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  .gg-tool-rail button.active {
    border-bottom-color: var(
      --gg-toolActive,
      var(--gg-theme-toolActive, currentColor)
    );
    color: var(--gg-toolActive, var(--gg-theme-toolActive, currentColor));
  }

  .gg-tool-recovery-actions:empty {
    display: none;
  }

  /* Container queries cascade across component boundaries; keep the
     responsive narrow layout for engines that honour named containers. */
  @container gg-plot (max-width: 559px) {
    .gg-tool-rail {
      top: -92px;
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
    }

    .gg-tool-modes,
    .gg-tool-recovery-actions {
      width: 100%;
    }
  }

  /* Prop-driven fallback for engines that do not apply a query to
     descendants of a component-owned named container during hydration. */
  .gg-tool-rail-narrow {
    top: -92px;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .gg-tool-rail-narrow .gg-tool-modes,
  .gg-tool-rail-narrow .gg-tool-recovery-actions {
    width: 100%;
  }

  @media (forced-colors: active) {
    .gg-tool-rail button:focus-visible {
      outline-color: Highlight;
    }

    .gg-tool-rail button.active {
      border-bottom-color: Highlight;
      color: ButtonText;
    }
  }
</style>
