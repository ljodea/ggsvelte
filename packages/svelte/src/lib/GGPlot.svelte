<script
  lang="ts"
  generics="Row extends Record<string, CellValue> = Record<string, CellValue>, Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row"
>
  /**
   * <GGPlot> — the props-first Svelte adapter (plan: "Svelte adapter").
   *
   * Guaranteed API: `spec={...}` or `data`/`aes`/`layers` props. Declaration-
   * only children (<GeomPoint>/<GeomLine>) are OPTIONAL sugar; explicit
   * `layers` props win over children when both are present.
   *
   * Reactivity: spec assembly is $derived; model production runs in the plot
   * runtime with run-id gating; the committed scale
   * state lives in a NON-reactive box (never read-modify-write shared reactive
   * state across init/teardown — decision 0001, finding 3). That box is what
   * makes discrete colors value-stable across data changes AND across
   * brush-to-zoom respecs.
   *
   * M2 compositing (decision 0006): when any layer resolves to the canvas
   * backend, the plot root becomes an ordered list of full-size sibling
   * strata (SVG chrome-bottom, mark strata in svg/canvas, SVG chrome-top) —
   * document order = paint order, no z-index anywhere. Every stratum is
   * pointer-events: none; ONE transparent capture layer (last child) owns
   * all pointer events and resolves them through the plot-px hit index, so
   * hover/tooltip/brush never care which stratum painted a mark. Hover,
   * tooltip, and the transient brush are pure overlays — the pipeline NEVER
   * re-runs for them. Brush-to-zoom is an intentional respec (explicit
   * continuous domains via scale inversion) with prevScales flowing, so
   * color assignments never shift. Double-click resets the zoom;
   * resetScales() (component export) also clears grow-mode scale state.
   *
   * Memory (plan: "Memory ownership"): the previous RenderModel is disposed
   * on commit ($effect cleanup — runs after the DOM has moved to the new
   * model) and the last one on unmount.
   *
   * Controller wiring lives in `plot-orchestrator.svelte.ts` (construction /
   * effect-order contract documented there).
   */
  import type { CellValue } from "@ggsvelte/core";
  import { sceneLabel } from "@ggsvelte/core";

  import type {
    LegendFocusEvent,
    PlotInspection,
    PlotInteractionEvent,
    PlotSelection,
    ZoomDomains,
  } from "./interaction/interaction.js";
  import type { PlotInteractionController } from "./interaction/controller.svelte.js";
  import { provideRegistry } from "./geoms/registry.svelte.js";
  import { shouldRenderInteractionLiveRegion } from "./legend/surface.js";
  import { resolveInteractionLiveText } from "./assembly/labels.js";
  import {
    isContainerWidthProp,
    isNarrowToolsWidth,
    isTooltipDocked,
    plotTooltipDomId,
    resolveCaptureAriaControls,
    resolveClearLegendX,
    tooltipViewportSize,
  } from "./assembly/layout.js";
  import BoundsEditor from "./interval/BoundsEditor.svelte";
  import type { GGPlotProps } from "./plot-props.js";
  import { createPlotOrchestrator } from "./plot-orchestrator.svelte.js";
  import CaptureSurface from "./surface/CaptureSurface.svelte";
  import LegendFilters from "./legend/LegendFilters.svelte";
  import LegendTargets from "./legend/LegendTargets.svelte";
  import MarkStrata from "./scene/MarkStrata.svelte";
  import SceneOverlays from "./scene/SceneOverlays.svelte";
  import StatusChrome from "./chrome/StatusChrome.svelte";
  import Tooltip from "./inspection/Tooltip.svelte";
  import ToolRail from "./chrome/ToolRail.svelte";

  const {
    spec,
    data,
    aes: mapping,
    layers,
    facet,
    coord,
    scales,
    legend,
    theme,
    labs,
    a11y,
    width,
    height,
    key: datumKey,
    inspect = false,
    select = false,
    zoom = false,
    legendFocus = false,
    legendFilter = false,
    tool,
    interaction,
    interactionScope,
    ariaLabel,
    oninspect,
    onselect,
    onzoom,
    onlegendfocus,
    onlegendfilter,
    oninteraction,
    ondiagnostic,
    ontoolchange,
    onrender,
    children,
  }: GGPlotProps<Row, Identity> = $props();

  const registry = provideRegistry();
  let root = $state<HTMLDivElement | null>(null);
  let captureSurface = $state<HTMLDivElement | null>(null);
  let a11yTableOpen = $state(false);
  const plotId = $props.id();

  const engine = createPlotOrchestrator<Row, Identity>({
    registry,
    plotId,
    root: () => root,
    captureSurface: () => captureSurface,
    spec: () => spec,
    data: () => data,
    mapping: () => mapping,
    layers: () => layers,
    facet: () => facet,
    coord: () => coord,
    scales: () => scales,
    legend: () => legend,
    theme: () => theme,
    labs: () => labs,
    a11y: () => a11y,
    width: () => width,
    height: () => height,
    datumKey: () => datumKey,
    inspect: () => inspect,
    select: () => select,
    zoom: () => zoom,
    legendFocus: () => legendFocus,
    legendFilter: () => legendFilter,
    tool: () => tool,
    // The PublicKey → PropertyKey widening casts live HERE (component-local
    // generic erased at the orchestrator boundary; same widening the pre-S11
    // factory* aliases performed).
    interaction: () =>
      interaction as PlotInteractionController<PropertyKey> | undefined,
    interactionScope: () => interactionScope,
    oninspect: () =>
      oninspect as
        | ((
            event: PlotInspection<Record<string, CellValue>, PropertyKey>,
          ) => void)
        | undefined,
    onselect: () =>
      onselect as ((event: PlotSelection<PropertyKey>) => void) | undefined,
    onzoom: () => onzoom,
    onlegendfocus: () =>
      onlegendfocus as
        ((event: LegendFocusEvent<PropertyKey>) => void) | undefined,
    onlegendfilter: () => onlegendfilter,
    oninteraction: () =>
      oninteraction as
        | ((
            event: PlotInteractionEvent<Record<string, CellValue>, PropertyKey>,
          ) => void)
        | undefined,
    ondiagnostic: () => ondiagnostic,
    ontoolchange: () => ontoolchange,
    onrender: () => onrender,
  });

  const {
    zoomState,
    legendFilterState,
    runtime,
    inspectionState,
    surfaceState,
    selectionState,
    legendFocusState,
    intervalState,
    chromeState,
    announcer,
  } = engine;

  /**
   * Clear committed grow-mode scale state and any brush zoom so the next
   * render re-trains scales from the current data. Call after data changes
   * that drop categories whose reserved colors should not persist.
   */
  export function resetScales(): void {
    runtime.resetScales();
  }

  /** Replace one or both continuous zoom domains without disturbing the
   *  other channel. This is the controlled linking/programmatic-zoom path. */
  export function setZoom(domains: Partial<ZoomDomains>): void {
    zoomState.setZoomDomains(domains);
  }
</script>

<!-- Declaration-only children emit no markup. Render them outside and before
     the root so SSR registers every layer before root attributes read derived
     plot state; placing them inside the root is too late in Svelte's one-pass
     server evaluation even when they appear first in source order. -->
{@render children?.()}

<!-- The root div is the plot's stable mount point and carries the
     data-gg-ready readiness signal. Compositing (decision 0006): ordered
     full-size sibling strata, document order = paint order, no z-index;
     all strata inert; the capture layer (last child) owns pointer events. -->
<div
  bind:this={root}
  class="gg-plot-root"
  class:gg-container-width={isContainerWidthProp(width)}
  class:gg-with-tool-rail={chromeState.showToolRail}
  class:gg-with-legend-clear={engine.legendClearActive}
  class:gg-with-legend-filters={engine.filterableLegendEntries.length > 0}
  class:gg-narrow-tools={isNarrowToolsWidth(runtime.resolvedWidth)}
  class:gg-with-docked-tooltip={isTooltipDocked({
    inspectionState: inspectionState.inspection?.state,
    widthPx: runtime.resolvedWidth,
  })}
  data-gg-ready={runtime.ready ? "true" : "false"}
  style={chromeState.rootStyle}
>
  {#if chromeState.showToolRail}
    <ToolRail
      availableTools={chromeState.availableTools}
      activeTool={surfaceState.activeTool}
      ready={runtime.ready}
      emptyPlot={chromeState.emptyPlot}
      narrow={isNarrowToolsWidth(runtime.resolvedWidth)}
      zoomDomains={zoomState.effectiveZoomDomains}
      hasPointSelection={chromeState.hasPointSelection}
      hasIntervalSelection={chromeState.hasIntervalSelection}
      intervalTargetLabel={intervalState.currentIntervalTargetLabel}
      canSetIntervalBounds={!chromeState.emptyPlot &&
        chromeState.preciseIntervalAxes.length > 0 &&
        intervalState.intervalBoundsTargetAvailable}
      canSetZoomBounds={!chromeState.emptyPlot &&
        chromeState.preciseZoomAxes.length > 0}
      intervalAxes={chromeState.preciseIntervalAxes}
      zoomAxes={chromeState.preciseZoomAxes}
      onChooseTool={surfaceState.chooseTool}
      onResetZoom={zoomState.resetZoom}
      onClearPointSelection={selectionState.clearPointSelection}
      onClearIntervalSelection={intervalState.clearIntervalSelection}
      onClearCurrentInterval={intervalState.clearCurrentPanelInterval}
      onEditBounds={intervalState.openBoundsEditor}
    />
  {/if}
  {#if intervalState.boundsEditorInput !== null}
    <div class="gg-precise-bounds">
      <BoundsEditor
        input={intervalState.boundsEditorInput}
        returnFocus={intervalState.boundsReturnFocus}
        onapply={intervalState.applyPreciseBounds}
        oncancel={intervalState.cancelBoundsEditor}
      />
    </div>
  {/if}
  {#if runtime.model !== null}
    {@const currentModel = runtime.model}
    <MarkStrata
      model={currentModel}
      strata={runtime.strata}
      {ariaLabel}
      markLabel={chromeState.markLabel}
      interactionMasks={engine.interactionMasks}
      {a11yTableOpen}
      onA11yToggle={() => (a11yTableOpen = !a11yTableOpen)}
      onPainted={runtime.notifyPainted}
    />
    <LegendTargets
      entries={engine.interactiveLegendEntries}
      previewIdentity={legendFocusState.previewIdentity}
      pressedIdentity={engine.effectiveLegendPressed}
      rovingIndex={legendFocusState.rovingIndex}
      sceneWidth={currentModel.scene.width}
      sceneHeight={currentModel.scene.height}
      clearLegendX={resolveClearLegendX({
        legendFocusEnabled: engine.legendFocusEnabled,
        pressedScale: engine.effectiveLegendPressed?.scale ?? null,
        legends: currentModel.scene.legends,
      })}
      onPreviewIndex={legendFocusState.onPreviewIndex}
      onPreviewClear={legendFocusState.onPreviewClear}
      onPointerDown={legendFocusState.onLegendPointerDown}
      onPointerUp={legendFocusState.onLegendPointerUp}
      onPointerCancel={legendFocusState.setTouchIndexCleared}
      onFocus={legendFocusState.onLegendFocus}
      onBlur={legendFocusState.onLegendBlur}
      onClick={legendFocusState.onLegendClick}
      onKeyDown={legendFocusState.onLegendKeydown}
      onClearPointerDown={legendFocusState.setClearPointerType}
      onClearPointerCancel={() => legendFocusState.setClearPointerType(null)}
      onClearClick={legendFocusState.clearLegendFromControl}
    />
    <LegendFilters
      controller={legendFilterState}
      entries={engine.filterableLegendEntries}
      belowClearFocus={engine.legendClearActive}
    />
    <SceneOverlays
      width={currentModel.scene.width}
      height={currentModel.scene.height}
      interactive={engine.interactive}
      surfaceInteractive={engine.surfaceInteractive}
      inspection={inspectionState.inspection}
      inspectionPanel={inspectionState.inspectionPanel}
      coordFlipped={engine.coordFlipped}
      hoverChrome={engine.hoverChrome}
      selectedAnchors={engine.selectedAnchors}
      emphasizedAnchors={engine.emphasizedAnchors}
      brushRect={surfaceState.brushRect}
      activeTool={surfaceState.activeTool}
      areaAwaitingSecond={surfaceState.areaAwaitingSecond}
      committedInterval={intervalState.committedInterval}
    />
    {#if engine.surfaceInteractive}
      <!-- Order (document = paint): overlay → capture → Tooltip → status chrome. -->
      <CaptureSurface
        bind:element={captureSurface}
        {plotId}
        activeTool={surfaceState.activeTool}
        ariaLabel={ariaLabel ??
          engine.assembled?.labs?.title ??
          sceneLabel(currentModel.scene)}
        ariaControls={resolveCaptureAriaControls({
          inspectionState: inspectionState.inspection?.state,
          contentMode: engine.interactionConfig.inspect?.contentMode,
          plotId,
        })}
        onFocus={() => {
          if (inspectionState.inspection === null) inspectionState.navigate(1);
        }}
        onBlur={surfaceState.onSurfaceBlur}
        onPointerMove={surfaceState.onPointerMove}
        onPointerLeave={surfaceState.onPointerLeave}
        onPointerDown={surfaceState.onPointerDown}
        onPointerUp={surfaceState.onPointerUp}
        onPointerCancel={surfaceState.onPointerCancel}
        onLostPointerCapture={surfaceState.onLostPointerCapture}
        onClick={surfaceState.onCaptureClick}
        onKeyDown={surfaceState.onSurfaceKeyDown}
        onDblClick={zoomState.onDblClick}
      />
      {#if inspectionState.inspection !== null}
        {@const currentInspection = inspectionState.inspection}
        {@const tooltipSize = tooltipViewportSize({
          sceneWidth: currentModel.scene.width,
          sceneHeight: currentModel.scene.height,
          clientWidth: root?.clientWidth,
          clientHeight: root?.clientHeight,
        })}
        <Tooltip
          id={plotTooltipDomId(plotId)}
          inspection={currentInspection}
          width={tooltipSize.width}
          height={tooltipSize.height}
          content={engine.interactionConfig.inspect?.content}
          interactive={engine.interactionConfig.inspect?.contentMode ===
            "interactive"}
          docked={isTooltipDocked({
            inspectionState: currentInspection.state,
            widthPx: runtime.resolvedWidth,
          })}
          onenter={() => (engine.tooltipHovered = true)}
          onleave={() => {
            engine.tooltipHovered = false;
            if (inspectionState.inspection?.state !== "pinned")
              inspectionState.setInspection(null, "pointer");
          }}
          onclose={(source) => inspectionState.closeInspection(source, true)}
        />
      {/if}
    {/if}
    <!-- Status chrome after capture/tooltip; ids stay plot-scoped for
         aria-describedby. Parent reduced-motion rule does not match child
         nodes (chrome has no transitions — intentional no-op). -->
    <StatusChrome
      {plotId}
      showInstructions={engine.surfaceInteractive}
      description={surfaceState.surfaceDescription}
      activeDatumLabel={chromeState.datumLabel(
        inspectionState.inspection?.focus.row ?? null,
      )}
      showAreaInstruction={engine.surfaceInteractive &&
        surfaceState.areaAwaitingSecond}
      showLiveRegion={shouldRenderInteractionLiveRegion({
        surfaceInteractive: engine.surfaceInteractive,
        legendFocusEnabled: engine.legendFocusEnabled,
        legendFilterEnabled: legendFilterState.options !== null,
      })}
      liveText={resolveInteractionLiveText({
        announcement: announcer.text,
        model: currentModel,
        inspection: inspectionState.inspection,
      })}
      emptyPlot={chromeState.emptyPlot}
      capabilityStatus={chromeState.capabilityStatus}
    />
  {/if}
</div>

<style>
  .gg-precise-bounds {
    position: absolute;
    /* Above the transparent legend hit targets (z-index 5): the open editor
       must be the top interactive layer or invisible legend buttons
       intercept pointer input meant for its fields. */
    z-index: 6;
    top: 8px;
    left: 8px;
    right: 8px;
    max-width: 560px;
    padding: 8px;
    background: var(--gg-panelBg, var(--gg-theme-panelBg, Canvas));
    box-shadow: 0 2px 12px color-mix(in srgb, currentColor 18%, transparent);
    pointer-events: auto;
  }

  .gg-plot-root {
    position: relative;
    display: inline-block;
    line-height: 0;
    max-width: 100%;
    container: gg-plot / inline-size;
  }

  .gg-container-width {
    display: block;
    width: 100%;
  }

  /* Keep controls in their own row so they never obscure titles, legends,
     marks, or axes. The plot retains its exact scene coordinate system. */
  .gg-with-tool-rail {
    margin-top: 52px;
  }

  .gg-with-legend-clear {
    margin-bottom: 48px;
  }

  .gg-with-legend-filters {
    margin-bottom: 58px;
  }

  /* Both control sets active: the Clear-focus button keeps the first row;
     the filter fieldset moves to its own row below so its labels can never
     cover the button. Reserve both rows. */
  .gg-with-legend-clear.gg-with-legend-filters {
    margin-bottom: 106px;
  }

  .gg-with-docked-tooltip {
    margin-bottom: 260px;
  }

  /* Strata: full-size positioned siblings; document order = paint order
     (no z-index anywhere — decision 0006). All inert; the capture layer
     owns pointer events. Parent-owned so extracted overlay SVGs with
     class gg-stratum stay absolutely positioned. */
  .gg-plot-root :global(.gg-stratum) {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  @container gg-plot (max-width: 559px) {
    .gg-with-tool-rail {
      margin-top: 96px;
    }
  }

  /* ResizeObserver-backed fallback for engines that do not apply a query to
     descendants of a component-owned named container during hydration. */
  .gg-narrow-tools.gg-with-tool-rail {
    margin-top: 96px;
  }

  @media (prefers-reduced-motion: reduce) {
    /* :global so the policy reaches extracted child components (mark strata,
       capture surface, status chrome) whose nodes are outside this scope. */
    .gg-plot-root :global(*) {
      scroll-behavior: auto;
      transition: none !important;
      animation: none !important;
    }
  }
</style>
