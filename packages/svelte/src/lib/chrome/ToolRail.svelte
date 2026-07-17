<script lang="ts">
  import type { InteractionTool, ZoomDomains } from "../interaction.js";

  type RecoveryInputSource = "keyboard" | "pointer" | "touch";

  const {
    availableTools,
    activeTool,
    ready,
    emptyPlot,
    narrow = false,
    zoomDomains = null,
    hasPointSelection = false,
    hasIntervalSelection = false,
    intervalTargetLabel,
    canSetIntervalBounds = false,
    canSetZoomBounds = false,
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
    intervalTargetLabel?: string | undefined;
    canSetIntervalBounds?: boolean;
    canSetZoomBounds?: boolean;
    intervalAxes?: readonly ("x" | "y")[];
    zoomAxes?: readonly ("x" | "y")[];
    onChooseTool: (tool: InteractionTool) => void;
    onResetZoom: (source: RecoveryInputSource) => void;
    onClearPointSelection: (source: RecoveryInputSource) => void;
    onClearIntervalSelection: (source: RecoveryInputSource) => void;
    onClearCurrentInterval: (source: RecoveryInputSource) => void;
    onEditBounds: (
      action: "select" | "zoom",
      axis: "x" | "y",
      trigger: HTMLElement,
    ) => void;
  } = $props();

  let recoveryPointerType: string | null = null;

  function recoverySource(event: MouseEvent): RecoveryInputSource {
    const source =
      recoveryPointerType === "touch"
        ? "touch"
        : recoveryPointerType === null && event.detail === 0
          ? "keyboard"
          : "pointer";
    recoveryPointerType = null;
    return source;
  }

  function captureRecoveryPointer(event: PointerEvent): void {
    recoveryPointerType = event.pointerType;
  }

  function labelFor(tool: InteractionTool): string {
    if (tool === "select-area") return "Select area";
    if (tool === "zoom-area") return "Zoom area";
    if (tool === "point") return "Select point";
    return "Inspect";
  }

  function boundsLabel(
    action: "select" | "zoom",
    axis: "x" | "y",
    editing: boolean,
  ): string {
    const target =
      action === "select" && intervalTargetLabel !== undefined
        ? `: ${intervalTargetLabel}`
        : "";
    return `${editing ? "Edit" : "Set"} ${axis} ${action === "select" ? "selection" : "zoom"} bounds${target}`;
  }

  function panelClearLabel(): string {
    return `Clear panel selection${intervalTargetLabel === undefined ? "" : `: ${intervalTargetLabel}`}`;
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
      <button
        type="button"
        disabled={!ready}
        onpointerdown={captureRecoveryPointer}
        onpointercancel={() => (recoveryPointerType = null)}
        onclick={(event) => onResetZoom(recoverySource(event))}
        >Reset zoom</button
      >
    {/if}
    {#if canSetZoomBounds}
      {#each zoomAxes as axis (axis)}
        <button
          type="button"
          disabled={!ready}
          onclick={(event) => onEditBounds("zoom", axis, event.currentTarget)}
          >{boundsLabel("zoom", axis, zoomDomains !== null)}</button
        >
      {/each}
    {/if}
    {#if hasPointSelection}
      <button
        type="button"
        disabled={!ready}
        onpointerdown={captureRecoveryPointer}
        onpointercancel={() => (recoveryPointerType = null)}
        onclick={(event) => onClearPointSelection(recoverySource(event))}
        >Clear selection</button
      >
    {/if}
    {#if hasIntervalSelection}
      <button
        type="button"
        disabled={!ready}
        onpointerdown={captureRecoveryPointer}
        onpointercancel={() => (recoveryPointerType = null)}
        onclick={(event) => onClearCurrentInterval(recoverySource(event))}
        >{panelClearLabel()}</button
      >
      <button
        type="button"
        disabled={!ready}
        onpointerdown={captureRecoveryPointer}
        onpointercancel={() => (recoveryPointerType = null)}
        onclick={(event) => onClearIntervalSelection(recoverySource(event))}
        >Clear all selections</button
      >
    {/if}
    {#if canSetIntervalBounds}
      {#each intervalAxes as axis (axis)}
        <button
          type="button"
          disabled={!ready}
          onclick={(event) => onEditBounds("select", axis, event.currentTarget)}
          >{boundsLabel("select", axis, hasIntervalSelection)}</button
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
    /* Modes keep their content width; R3 recovery/bounds actions can outgrow
       any plot width, so their track shrinks and scrolls instead of
       overlapping the mode tabs. */
    grid-template-columns: auto minmax(0, 1fr);
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

  .gg-tool-recovery-actions {
    overflow-x: auto;
  }

  .gg-tool-rail button {
    min-height: 44px;
    min-width: 44px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0 10px;
    background: transparent;
    /* --gg-theme-interactionMuted is a NUMERIC alpha token (theme.ts
       interactionMuted: 0.36) — substituting it here made this declaration
       invalid at computed-value time, so only --gg-interactionMuted (a
       consumer-supplied color) may appear in a color position. */
    color: var(--gg-interactionMuted, currentColor);
    font: inherit;
    font-size: 14px;
    white-space: nowrap;
    flex-shrink: 0;
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

    /* Chromium does not repaint a button's forced text/border color when
       `disabled` is removed unless the COMPUTED value changes with the state
       (these buttons render disabled during SSR and are enabled after
       hydration, so without this rule they froze race-dependently on the
       disabled GrayText paint — PR #160's vr flake). Both properties are
       needed: the base rule's `transparent` border is also forced-painted.
       Placed after `.active` so a disabled active tool still reads as
       disabled. */
    .gg-tool-rail button:disabled {
      border-bottom-color: GrayText;
      color: GrayText;
    }
  }
</style>
