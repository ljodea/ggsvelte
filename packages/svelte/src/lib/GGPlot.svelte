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
   * runtime (`createPlotRuntime`) with run-id gating; the committed scale
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
   */
  import type { CellValue } from "@ggsvelte/core";
  import { sceneLabel } from "@ggsvelte/core";
  import type { SceneHitIndex } from "@ggsvelte/core/dom";
  import { buildHitIndex } from "@ggsvelte/core/dom";
  import type { DataInput, PortableSpec } from "@ggsvelte/spec";

  import {
    normalizeInteractionConfig,
    type InteractionDiagnostic,
    type LegendFocusEvent,
    type PlotInspection,
    type PlotInteractionEvent,
    type PlotInteractionScope,
    type PlotSelection,
    type ZoomDomains,
  } from "./interaction.js";
  import type { PlotInteractionController } from "./interaction-controller.svelte.js";
  import { provideRegistry } from "./registry.svelte.js";
  import {
    assemblePortableSpec,
    isFacetedPlotIntent,
    resolveInteractionScope,
    toLayerInput,
  } from "./plot-assemble.js";
  import { shouldRenderInteractionLiveRegion } from "./plot-legend-surface.js";
  import { resolveInteractionLiveText } from "./plot-labels.js";
  import {
    isContainerWidthProp,
    isNarrowToolsWidth,
    isTooltipDocked,
    plotTooltipDomId,
    resolveCaptureAriaControls,
    resolveClearLegendX,
    tooltipViewportSize,
  } from "./plot-layout.js";
  import BoundsEditor from "./BoundsEditor.svelte";
  import {
    createSourceIdentityTracker,
    dataIdentityEpochToken,
  } from "./plot-semantic-keys.js";
  import {
    createPlotAnnouncer,
    createSemanticKeyService,
  } from "./plot-shared-services.svelte.js";
  import { createPlotRuntime } from "./plot-runtime.svelte.js";
  import type { LegendEntryIdentity } from "./plot-legend-focus.js";
  import type { GGPlotProps } from "./plot-props.js";
  import PlotCaptureSurface from "./PlotCaptureSurface.svelte";
  import PlotLegendFilters from "./PlotLegendFilters.svelte";
  import PlotLegendTargets from "./PlotLegendTargets.svelte";
  import PlotMarkStrata from "./PlotMarkStrata.svelte";
  import PlotSceneOverlays from "./PlotSceneOverlays.svelte";
  import PlotStatusChrome from "./PlotStatusChrome.svelte";
  import Tooltip from "./Tooltip.svelte";
  import ToolRail from "./ToolRail.svelte";
  import { createLegendFilterState } from "./legend-filter-state.svelte.js";
  import { createLegendFocusState } from "./legend-focus-state.svelte.js";
  import { createPlotZoomState } from "./plot-zoom-state.svelte.js";
  import { createIntervalState } from "./interval-state.svelte.js";
  import { createInspectionState } from "./inspection-state.svelte.js";
  import { createSurfaceState } from "./surface-state.svelte.js";
  import { createSelectionState } from "./selection-state.svelte.js";
  import { createPlotChromeState } from "./plot-chrome-state.svelte.js";

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

  // Reading descriptors through toLayerInput goes through live getters, so
  // geom prop changes flow into this $derived without re-registration.
  // Explicit `spec` short-circuits before registry/children so ignored props
  // do not become reactive dependencies of the assembled plot.
  const assembled: PortableSpec | null = $derived.by(() => {
    if (spec !== undefined) return assemblePortableSpec({ spec, layers: [] });
    return assemblePortableSpec({
      ...(data !== undefined && { data: data as DataInput | readonly Row[] }),
      ...(mapping !== undefined && { aes: mapping }),
      layers: layers ?? registry.layers.map(toLayerInput),
      ...(facet !== undefined && { facet }),
      ...(coord !== undefined && { coord }),
      ...(scales !== undefined && { scales }),
      ...(legend !== undefined && { legend }),
      ...(theme !== undefined && { theme }),
      ...(labs !== undefined && { labs }),
      ...(a11y !== undefined && { a11y }),
    });
  });

  // Facet intent: raw prop (declaration-only children before layers register)
  // OR assembled.facet (portable-spec plots that embed facet without a prop).
  const facetedPlot = $derived(isFacetedPlotIntent({ facet, assembled }));

  const resolvedInteractionScope: PlotInteractionScope = $derived(
    resolveInteractionScope({
      interaction,
      ...(interactionScope !== undefined && { interactionScope }),
      zoom,
      faceted: facetedPlot,
      ...(datumKey !== undefined && { datumKey }),
      assembled,
    }),
  );

  const interactionConfig = $derived(
    normalizeInteractionConfig(
      {
        inspect,
        select,
        zoom,
        legendFocus,
        ...(tool !== undefined && { tool }),
      },
      {
        faceted: facetedPlot,
        hasKey: datumKey !== undefined,
      },
    ),
  );

  function deliverDiagnostic(diagnostic: InteractionDiagnostic): void {
    ondiagnostic?.(diagnostic);
    const nodeEnvironment = (
      globalThis as { process?: { env?: { NODE_ENV?: string } } }
    ).process?.env?.NODE_ENV;
    if (nodeEnvironment !== "production" && ondiagnostic === undefined)
      console.warn(`[ggsvelte:${diagnostic.code}] ${diagnostic.message}`);
  }

  $effect(() => {
    for (const diagnostic of interactionConfig.diagnostics)
      deliverDiagnostic(diagnostic);
  });

  // Shared controller-factory dep aliases: ONE place for the PublicKey →
  // PropertyKey widening casts every extracted controller (S2–S8) wires.
  const factoryInteraction = $derived(
    interaction as PlotInteractionController<PropertyKey> | undefined,
  );
  const factoryOninteraction = $derived(
    oninteraction as
      | ((
          event: PlotInteractionEvent<Record<string, CellValue>, PropertyKey>,
        ) => void)
      | undefined,
  );
  const factoryOninspect = $derived(
    oninspect as
      ((event: PlotInspection<Record<string, CellValue>>) => void) | undefined,
  );
  // Announcer is declared later; the sink is handler-only (never construction).
  const announceSink = (message: string): void => {
    announcer.announce(message);
  };

  // Construction order is the topological order of direct construction-time
  // reads; effect registration sequence is load-bearing. Deferred thunks break
  // the runtime cycles (surface ↔ inspection ↔ interval ↔ selection).

  // ------------------------------------------------------------ zoom respec
  // Construction-time deriveds read interaction/scope/zoomConfig/assembled
  // only — model/coordFlipped/announce are deferred getters (later-declared).
  const zoomState = createPlotZoomState({
    interaction: () => factoryInteraction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    zoomConfig: () => interactionConfig.zoom,
    assembled: () => assembled,
    // model / coordFlipped declared after the runtime; handlers only.
    model: () => runtime.model,
    coordFlipped: () => coordFlipped,
    onzoom: () => onzoom,
    oninteraction: () => factoryOninteraction,
    announce: announceSink,
  });

  // Source identity/order epoch: stable through responsive layout and zoom
  // respecs, different when normalized inline data or data references change.
  // Tracker is owned for the component lifetime (never cleared).
  const { sourceIdentity } = createSourceIdentityTracker();
  const dataIdentityEpoch = $derived(
    dataIdentityEpochToken({
      assembled,
      dataToken: sourceIdentity(data),
      specToken: sourceIdentity(spec),
    }),
  );

  let root = $state<HTMLDivElement | null>(null);
  // Live-region announcer (owned early so legend-reset effects can call it).
  const announcer = createPlotAnnouncer();

  // ------------------------------------------------- legend filter
  // Construction-time deriveds read legendFilter/effectiveSpec only —
  // model is deferred (declared after the runtime).
  const legendFilterState = createLegendFilterState({
    effectiveSpec: () => zoomState.effectiveSpec,
    legendFilterProp: () => legendFilter,
    onlegendfilter: () => onlegendfilter,
    oninteraction: () => oninteraction,
    announce: announceSink,
    // model is declared after the runtime; the getter is only invoked from
    // late catalog effects (never at construction).
    model: () => runtime.model,
  });

  /**
   * Clear committed grow-mode scale state and any brush zoom so the next
   * render re-trains scales from the current data. Call after data changes
   * that drop categories whose reserved colors should not persist.
   */
  export function resetScales(): void {
    runtime.resetScales();
  }

  // ------------------------------------------------- plot runtime
  // Factory sits after zoom-respec and legend-filter so every direct
  // construction-time dep is already initialized (TDZ).
  // Effect registration: model dispose/onrender effects register here;
  // ResizeObserver registers later via registerLateEffects (after legend
  // reconcile) — safe because the observer callback is async.
  const runtime = createPlotRuntime({
    widthProp: () => width,
    heightProp: () => height,
    assembled: () => assembled,
    effectiveSpec: () => zoomState.effectiveSpec,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    effectiveLegendFilters: () => legendFilterState.filters,
    root: () => root,
    resetZoom: () => zoomState.resetForScales(),
    onrender: () => onrender,
  });
  // Model dispose + onrender effects (after the legend-reset effects that
  // registered during legendFilterState construction; before late effects).
  runtime.registerModelEffects();

  // Semantic resolution as soon as the runtime model exists. Diagnostics
  // effects register later; early construction makes interval projection
  // safe when a shared controller arrives with pre-populated non-union
  // intervals (#165).
  const semanticKeys = createSemanticKeyService({
    model: () => runtime.model,
    assembled: () => assembled,
    datumKey: () =>
      datumKey as
        string | ((row: never, index: number) => PropertyKey) | undefined,
    data: () => data,
    spec: () => spec,
    sourceIdentity,
    deliverDiagnostic,
  });
  const semanticKey = semanticKeys.semanticKey;
  const candidateSemanticKeys = semanticKeys.candidateSemanticKeys;

  let a11yTableOpen = $state(false);

  // ---------------------------------------------------------- interaction
  // source rows/spec -> pipeline/scene -> hit index -> semantic resolver ->
  // chart-local reducer -> tooltip/crosshair/tools/callbacks. Presentation
  // consumes one resolved inspection and never reconstructs grouping itself.
  const interactive = $derived(interactionConfig.interactive);
  const surfaceInteractive = $derived(
    interactionConfig.availableTools.length > 0,
  );
  const hitIndex: SceneHitIndex | null = $derived.by(() =>
    surfaceInteractive && runtime.model !== null
      ? buildHitIndex(runtime.model.scene)
      : null,
  );

  // ------------------------------------------------- inspection
  // Construction-time deriveds may read model / surfaceInteractive (both
  // earlier). Phased effects register later via registerInspectionEffects().
  // Reversed deps: reducer / clearBrush / chooseTool close over the later-
  // declared surfaceState (handler/effect-only; construction guard).
  const inspectionState = createInspectionState({
    model: () => runtime.model,
    // Deferred: surface owns the reducer (handler/effect only).
    reducer: () => surfaceState.reducer,
    inspectConfig: () => interactionConfig.inspect,
    surfaceInteractive: () => surfaceInteractive,
    inspectEnabled: () => inspectEnabled,
    dataIdentityEpoch: () => dataIdentityEpoch,
    // Deferred: semantic-key service is declared later (handler only).
    keyAt: (index) => semanticKeys.keyAt(index),
    root: () => root,
    captureSurface: () => captureSurface,
    plotId: () => plotId,
    tooltipHovered: () => tooltipHovered,
    clearTooltipHovered: () => {
      tooltipHovered = false;
    },
    clearBrush: () => surfaceState.clearBrush(),
    chooseTool: (next) => surfaceState.chooseTool(next),
    oninspect: () => factoryOninspect,
    oninteraction: () => factoryOninteraction,
    announce: announceSink,
    clearAnnouncement: () => announcer.clear(),
  });
  // ------------------------------------------------- surface
  // Construction-time deriveds read module-internal state + inspectConfig.
  // Sibling controllers, sinks, and chrome getters are handler/effect-only.
  // Phased effects register later via registerSurfaceEffects().
  const surfaceState = createSurfaceState({
    model: () => runtime.model,
    coordFlipped: () => coordFlipped,
    root: () => root,
    toolProp: () => tool,
    initialTool: () => interactionConfig.initialTool,
    // Deferred: chrome availableTools (handler/effect only).
    availableTools: () => chromeState.availableTools,
    inspectConfig: () => interactionConfig.inspect,
    selectConfig: () => interactionConfig.select,
    // Deferred: chrome canPublishPointSelection (handler only).
    pointSelectEnabled: () => chromeState.canPublishPointSelection,
    ontoolchange: () => ontoolchange,
    surfaceInteractive: () => surfaceInteractive,
    hitIndex: () => hitIndex,
    // Deferred: semantic-key service initializes later (issue #165).
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    inspection: () => inspectionState,
    // Deferred: interval is declared after surface (handler only).
    interval: () => intervalState,
    zoom: () => zoomState,
    // Deferred: selection controller is declared after surface (handler only).
    emitSelection: (event) => selectionState.emitSelection(event),
    // Deferred: semantic-key service is declared later (handler only).
    semanticKey: (row, index) => semanticKey(row, index),
    // Deferred: selection controller is declared after surface (handler only).
    togglePointKeys: (keys, source) =>
      selectionState.togglePointKeys(keys, source),
    tooltipHovered: () => tooltipHovered,
    announce: announceSink,
  });
  const coordFlipped = $derived(assembled?.coord?.type === "flip");
  let tooltipHovered = $state(false);
  let captureSurface = $state<HTMLDivElement | null>(null);
  // ------------------------------------------------- selection
  // Construction-time effectiveSelectedKeys reads earlier interaction/scope
  // only. Anchors and masks are methods (later-declared inputs).
  const selectionState = createSelectionState({
    model: () => runtime.model,
    interaction: () => factoryInteraction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    // Deferred: interval is declared after this factory (method only).
    effectiveIntervalKeys: () => intervalState.effectiveIntervalKeys,
    // Deferred: legend-focus is declared after this factory (method only).
    effectiveEmphasisKeys: () => legendFocusState.effectiveEmphasisKeys,
    // Deferred method-only projection of inspection focus for presentation masks.
    inspectionFocus: () => {
      const current = inspectionState.inspection;
      return current === null
        ? null
        : {
            sourceKeys: current.focus.sourceKeys,
            key: current.focus.key,
          };
    },
    // Deferred: semantic-key service initializes later (#165).
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    onselect: () => onselect as ((event: PlotSelection) => void) | undefined,
    oninteraction: () => factoryOninteraction,
    announce: announceSink,
  });
  // Shared enablement predicates (avoid re-typing the same config gates).
  const inspectEnabled = $derived(interactionConfig.inspect !== null);
  const legendFocusEnabled = $derived(interactionConfig.legendFocus !== null);
  // ------------------------------------------------- legend focus
  // Factory sits after the enablement cluster so construction-time
  // effectiveEmphasisKeys closes over earlier bindings only.
  const legendFocusState = createLegendFocusState({
    interaction: () => factoryInteraction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    legendFocusEnabled: () => legendFocusEnabled,
    legendFocusPreviewEnabled: () =>
      interactionConfig.legendFocus?.preview === true,
    root: () => root,
    semanticKeys: () => semanticKeys,
    entries: () => interactiveLegendEntries,
    // Deferred read of the later-declared cached derived (handlers only).
    pressed: () => effectiveLegendPressed,
    onlegendfocus: () =>
      onlegendfocus as
        ((event: LegendFocusEvent<PropertyKey>) => void) | undefined,
    oninteraction: () => factoryOninteraction,
    announce: announceSink,
  });
  // ------------------------------------------------- interval selection
  // Construction-time deriveds may read model/effectiveZoomDomains (both
  // earlier-declared). Effects register here — relative order is runtime
  // model effects < interval effects < semantic diagnostics.
  const intervalState = createIntervalState({
    model: () => runtime.model,
    interaction: () => factoryInteraction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    // Direct construction edges (not deferred thunks): zoom + selection
    // are already constructed when interval is built.
    commitZoom: zoomState.commitZoom,
    coordFlipped: () => coordFlipped,
    captureSurface: () => captureSurface,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    inspectionPanel: () => inspectionState.inspectionPanel,
    emitSelection: selectionState.emitSelection,
    announce: announceSink,
  });
  // ------------------------------------------------- plot chrome
  // All inputs earlier-declared. Pure construction-time deriveds —
  // no $state/handlers/effects.
  const chromeState = createPlotChromeState({
    model: () => runtime.model,
    zoomConfig: () => interactionConfig.zoom,
    selectConfig: () => interactionConfig.select,
    configuredAvailableTools: () => interactionConfig.availableTools,
    interactionDiagnostics: () => interactionConfig.diagnostics,
    interactive: () => interactive,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    effectiveIntervals: () => intervalState.effectiveIntervals,
    effectiveSelectedKeys: () => selectionState.effectiveSelectedKeys,
    effectiveEmphasisKeys: () => legendFocusState.effectiveEmphasisKeys,
    legendFocusEnabled: () => legendFocusEnabled,
    hasCanvas: () => runtime.hasCanvas,
    width: () => width,
    resolvedWidth: () => runtime.resolvedWidth,
    resolvedHeight: () => runtime.resolvedHeight,
  });
  // Method-call deriveds (not pure aliases) — keep as intermediate memos.
  const selectedAnchors = $derived(selectionState.computeSelectedAnchors());
  const emphasizedAnchors = $derived(selectionState.computeEmphasizedAnchors());

  const plotId = $props.id();
  // Semantic diagnostics effects (before host diagnostic / surface effects).
  semanticKeys.registerEffects();

  $effect(() => {
    for (const diagnostic of chromeState.areaScaleDiagnostics)
      deliverDiagnostic(diagnostic);
  });

  $effect(() => {
    for (const diagnostic of chromeState.legendDiagnostics)
      deliverDiagnostic(diagnostic);
  });

  // Surface window-teardown + tool-sync (after diagnostics, before catalog/
  // focus/inspection registrations).
  surfaceState.registerSurfaceEffects();

  // Three separate host deriveds — intermediate memo boundaries live here
  // (do NOT fold into one method).
  const presentationFocusKeys = $derived(
    selectionState.computePresentationFocusKeys(),
  );
  const semanticCandidateProjections = $derived(
    selectionState.computeSemanticCandidateProjections(),
  );
  const interactionMasks = $derived(
    selectionState.computeInteractionMasks(
      presentationFocusKeys,
      // Thunk: with empty focus (idle), the projections derived is never read.
      () => semanticCandidateProjections,
    ),
  );

  // Host-side deriveds kept outside the factory (construction-time free of
  // the model read).
  const interactiveLegendEntries = $derived(
    legendFocusState.computeInteractiveEntries(runtime.model),
  );

  const effectiveLegendPressed: LegendEntryIdentity | null = $derived(
    legendFocusState.computeLegendPressed(runtime.model),
  );

  // Single source for "the legend clear row is shown": the root class and
  // the filter fieldset's below-clear offset must flip together (the legend
  // layout test pins their combined geometry).
  const legendClearActive = $derived(
    legendFocusEnabled && effectiveLegendPressed !== null,
  );

  // Host-side derived kept outside the factory (construction-time free of
  // the model read).
  const filterableLegendEntries = $derived(
    legendFilterState.computeEntries(runtime.model),
  );
  // Catalog reconcile after model effects.
  legendFilterState.registerCatalogEffects(() => filterableLegendEntries);
  // Legend-focus reconcile after catalog.
  legendFocusState.registerReconcileEffects();
  // Inspection disposal + scene reconcile after legend-focus.
  inspectionState.registerInspectionEffects();

  /** Replace one or both continuous zoom domains without disturbing the
   *  other channel. This is the controlled linking/programmatic-zoom path. */
  export function setZoom(domains: Partial<ZoomDomains>): void {
    zoomState.setZoomDomains(domains);
  }

  // clientFlush/ready effect at end of script (late registration).
  runtime.registerLateEffects();
</script>

<!-- Children MUST render before any registry-consuming markup: SSR evaluates
     in one pass, so declaration-only geoms have to register first
     (decision 0001 — authoring rule, do not reorder). -->
<!-- The root div is the plot's stable mount point and carries the
     data-gg-ready readiness signal. Compositing (decision 0006): ordered
     full-size sibling strata, document order = paint order, no z-index;
     all strata inert; the capture layer (last child) owns pointer events. -->
<div
  bind:this={root}
  class="gg-plot-root"
  class:gg-container-width={isContainerWidthProp(width)}
  class:gg-with-tool-rail={chromeState.showToolRail}
  class:gg-with-legend-clear={legendClearActive}
  class:gg-with-legend-filters={filterableLegendEntries.length > 0}
  class:gg-narrow-tools={isNarrowToolsWidth(runtime.resolvedWidth)}
  class:gg-with-docked-tooltip={isTooltipDocked({
    inspectionState: inspectionState.inspection?.state,
    widthPx: runtime.resolvedWidth,
  })}
  data-gg-ready={runtime.ready ? "true" : "false"}
  style={chromeState.rootStyle}
>
  {@render children?.()}
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
    <PlotMarkStrata
      model={currentModel}
      strata={runtime.strata}
      markLabel={chromeState.markLabel}
      {interactionMasks}
      {a11yTableOpen}
      onA11yToggle={() => (a11yTableOpen = !a11yTableOpen)}
      onPainted={runtime.notifyPainted}
    />
    <PlotLegendTargets
      entries={interactiveLegendEntries}
      previewIdentity={legendFocusState.previewIdentity}
      pressedIdentity={effectiveLegendPressed}
      rovingIndex={legendFocusState.rovingIndex}
      sceneWidth={currentModel.scene.width}
      sceneHeight={currentModel.scene.height}
      clearLegendX={resolveClearLegendX({
        legendFocusEnabled,
        pressedScale: effectiveLegendPressed?.scale ?? null,
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
    <PlotLegendFilters
      controller={legendFilterState}
      entries={filterableLegendEntries}
      belowClearFocus={legendClearActive}
    />
    <PlotSceneOverlays
      width={currentModel.scene.width}
      height={currentModel.scene.height}
      {interactive}
      {surfaceInteractive}
      inspection={inspectionState.inspection}
      inspectionPanel={inspectionState.inspectionPanel}
      {coordFlipped}
      {selectedAnchors}
      {emphasizedAnchors}
      brushRect={surfaceState.brushRect}
      activeTool={surfaceState.activeTool}
      areaAwaitingSecond={surfaceState.areaAwaitingSecond}
      committedInterval={intervalState.committedInterval}
    />
    {#if surfaceInteractive}
      <!-- Order (document = paint): overlay → capture → Tooltip → status chrome. -->
      <PlotCaptureSurface
        bind:element={captureSurface}
        {plotId}
        activeTool={surfaceState.activeTool}
        ariaLabel={ariaLabel ??
          assembled?.labs?.title ??
          sceneLabel(currentModel.scene)}
        ariaControls={resolveCaptureAriaControls({
          inspectionState: inspectionState.inspection?.state,
          contentMode: interactionConfig.inspect?.contentMode,
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
          content={interactionConfig.inspect?.content}
          interactive={interactionConfig.inspect?.contentMode === "interactive"}
          docked={isTooltipDocked({
            inspectionState: currentInspection.state,
            widthPx: runtime.resolvedWidth,
          })}
          onenter={() => (tooltipHovered = true)}
          onleave={() => {
            tooltipHovered = false;
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
    <PlotStatusChrome
      {plotId}
      showInstructions={surfaceInteractive}
      description={surfaceState.surfaceDescription}
      activeDatumLabel={chromeState.datumLabel(
        inspectionState.inspection?.focus.row ?? null,
      )}
      showAreaInstruction={surfaceInteractive &&
        surfaceState.areaAwaitingSecond}
      showLiveRegion={shouldRenderInteractionLiveRegion({
        surfaceInteractive,
        legendFocusEnabled,
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
