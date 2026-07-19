/**
 * Deep plot-interaction assembly.
 *
 * Owns controller construction, deferred sibling wiring, shared Candidate
 * projection, and phased effect registration. Callers provide reactive plot
 * facts; construction topology remains an implementation detail here.
 */
import type { CellValue } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

import type { OrchestratorInputs } from "./plot-orchestrator.svelte.js";
import type {
  InteractionDiagnostic,
  PlotInteractionScope,
  ResolvedInteractionConfig,
} from "./interaction/interaction.js";
import { INTERACTION_DIAGNOSTIC_CATALOG } from "./interaction/interaction.js";
import { createPlotAnnouncer } from "./runtime/announcer.svelte.js";
import {
  createSourceIdentityTracker,
  createSemanticKeyService,
  dataIdentityEpochToken,
  type SemanticKeyService,
} from "./runtime/semantic-keys.svelte.js";
import { createPlotRuntime } from "./runtime/runtime.svelte.js";
import { createSemanticCandidateProjection } from "./runtime/semantic-candidate-projection.svelte.js";
import type { LegendEntryIdentity } from "./legend/focus.js";
import { createLegendFilterState } from "./legend/filter-state.svelte.js";
import { createLegendEntryKeyIndex } from "./legend/entry-key-index.svelte.js";
import { createLegendFocusState } from "./legend/focus-state.svelte.js";
import { createPlotZoomState, type PlotZoomState } from "./zoom/zoom-state.svelte.js";
import { createIntervalState } from "./interval/interval-state.svelte.js";
import { createInspectionState } from "./inspection/inspection-state.svelte.js";
import { createSurfaceState } from "./surface/surface-state.svelte.js";
import { createSelectionState, type SelectionState } from "./selection/selection-state.svelte.js";
import { createPlotChromeState } from "./chrome/chrome-state.svelte.js";

export type PlotInteractionAssemblyDeps<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
> = {
  inputs: OrchestratorInputs<Row, Identity>;
  assembled: () => PortableSpec | null;
  interactionConfig: () => ResolvedInteractionConfig;
  resolvedInteractionScope: () => PlotInteractionScope;
};

export function createPlotInteractionAssembly<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
>(deps: PlotInteractionAssemblyDeps<Row, Identity>) {
  const inputs = deps.inputs;
  const assembled = $derived(deps.assembled());
  const interactionConfig = $derived(deps.interactionConfig());
  const resolvedInteractionScope = $derived(deps.resolvedInteractionScope());
  function deliverDiagnostic(diagnostic: InteractionDiagnostic): void {
    const ondiagnostic = inputs.ondiagnostic();
    ondiagnostic?.(diagnostic);
    const nodeEnvironment = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
      ?.env?.NODE_ENV;
    if (nodeEnvironment !== "production" && ondiagnostic === undefined)
      console.warn(`[ggsvelte:${diagnostic.code}] ${diagnostic.message}`);
  }

  $effect(() => {
    for (const diagnostic of interactionConfig.diagnostics) deliverDiagnostic(diagnostic);
  });

  // Wiring advisories (ADR 0013 audit): prop combinations that silently do
  // nothing. Unlike config diagnostics (re-delivered per recompute), these
  // fire once per prop per plot instance — a later capability toggle must
  // not re-advise.
  const wiringDiagnostics = $derived.by((): InteractionDiagnostic[] => {
    const list: InteractionDiagnostic[] = [];
    if (inputs.interactionScope() !== undefined && inputs.interaction() === undefined)
      list.push({ ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_SCOPE_WITHOUT_CONTROLLER });
    const handlerCapabilityPairs = [
      ["oninspect", "inspect", inputs.oninspect(), inputs.inspect()],
      ["onselect", "select", inputs.onselect(), inputs.select()],
      ["onzoom", "zoom", inputs.onzoom(), inputs.zoom()],
      ["onlegendfocus", "legendFocus", inputs.onlegendfocus(), inputs.legendFocus()],
      ["onlegendfilter", "legendFilter", inputs.onlegendfilter(), inputs.legendFilter()],
    ] as const;
    for (const [handler, capability, handlerValue, capabilityValue] of handlerCapabilityPairs) {
      if (handlerValue === undefined) continue;
      // Capability "requested" (any value but undefined/false) is enough:
      // requested-but-degraded configs already get their own diagnostics
      // (requires-key, faceted zoom, ...) — never advise twice for one
      // mistake.
      if (capabilityValue !== undefined && capabilityValue !== false) continue;
      list.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_HANDLER_WITHOUT_CAPABILITY,
        prop: handler,
        actual: capability,
      });
    }
    return list;
  });
  const deliveredWiring = new Set<string>();
  $effect(() => {
    for (const diagnostic of wiringDiagnostics) {
      const dedupKey = `${diagnostic.code}:${diagnostic.prop}`;
      if (deliveredWiring.has(dedupKey)) continue;
      deliveredWiring.add(dedupKey);
      deliverDiagnostic(diagnostic);
    }
  });

  // The PublicKey → PropertyKey widening casts live at the GGPlot call site;
  // OrchestratorInputs is already declared in the widened form, so controller
  // deps consume inputs.interaction / inputs.oninteraction / inputs.oninspect
  // directly (handler contravariance covers the narrower per-event deps).
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
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    zoomConfig: () => interactionConfig.zoom,
    assembled: () => assembled,
    // model / coordFlipped declared after the runtime; handlers only.
    model: () => runtime.model,
    coordFlipped: () => coordFlipped,
    onzoom: () => inputs.onzoom(),
    oninteraction: inputs.oninteraction,
    announce: announceSink,
  });

  // Source identity/order epoch: O(R) row-ref order over data/spec *props*
  // (not assembled shells). Theme/labs/scales respecs do not re-walk cells;
  // new prop references or in-place row-order changes still bump the epoch.
  // Tracker is owned for the component lifetime (never cleared).
  const identityTracker = createSourceIdentityTracker();
  const dataIdentityEpoch = $derived.by(() => {
    const data = inputs.data();
    const spec = inputs.spec();
    const layers = inputs.layers();
    const layerCount = layers === undefined ? inputs.registry.layers.length : layers.length;
    // Ready without reading `assembled` so chrome-only respecs do not re-enter.
    const ready = spec !== undefined || layerCount > 0;
    const sourceIdentity = (value: unknown) => identityTracker.sourceIdentity(value);
    // assemblePortableSpec: explicit `spec` wins and ignores the data prop —
    // fingerprint the rendered source only (Codex P2).
    const contentData =
      spec !== undefined && typeof spec === "object" ? (spec as { data?: unknown }).data : data;
    const contentDatasets =
      spec !== undefined && typeof spec === "object"
        ? (spec as { datasets?: unknown }).datasets
        : undefined;
    return dataIdentityEpochToken({
      ready,
      dataToken: sourceIdentity(data),
      specToken: sourceIdentity(spec),
      data: contentData ?? null,
      datasets: contentDatasets ?? null,
      sourceIdentity,
    });
  });

  // Live-region announcer (owned early so legend-reset effects can call it).
  const announcer = createPlotAnnouncer();

  // ------------------------------------------------- legend filter
  // Construction-time deriveds read legendFilter/effectiveSpec only —
  // model is deferred (declared after the runtime).
  const legendFilterState = createLegendFilterState({
    effectiveSpec: () => zoomState.effectiveSpec,
    legendFilterProp: () => inputs.legendFilter(),
    onlegendfilter: () => inputs.onlegendfilter(),
    oninteraction: inputs.oninteraction,
    announce: announceSink,
    // model is declared after the runtime; the getter is only invoked from
    // late catalog effects (never at construction).
    model: () => runtime.model,
  });

  // ------------------------------------------------- plot runtime
  // Factory sits after zoom-respec and legend-filter so every direct
  // construction-time dep is already initialized (TDZ).
  // Effect registration: model dispose/onrender effects register here;
  // ResizeObserver registers later via registerLateEffects (after legend
  // reconcile) — safe because the observer callback is async.
  const runtime = createPlotRuntime({
    widthProp: () => inputs.width(),
    heightProp: () => inputs.height(),
    assembled: () => assembled,
    effectiveSpec: () => zoomState.effectiveSpec,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    effectiveLegendFilters: () => legendFilterState.filters,
    root: inputs.root,
    resetZoom: () => {
      zoomState.resetForScales();
    },
    onrender: () => inputs.onrender(),
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
    datumKey: () => inputs.datumKey(),
    data: () => inputs.data(),
    spec: () => inputs.spec(),
    sourceIdentity: (value: unknown) => identityTracker.sourceIdentity(value),
    deliverDiagnostic,
  });
  const semanticKey: SemanticKeyService["semanticKey"] = (...args) =>
    semanticKeys.semanticKey(...args);
  const candidateSemanticKeys: SemanticKeyService["candidateSemanticKeys"] = (...args) =>
    semanticKeys.candidateSemanticKeys(...args);

  // Legend entry → key index (lifted from semantic-keys in S16). Same relative
  // construction position as the derived it replaces — after semanticKeys,
  // before inspection — so the construction-order DAG is unchanged.
  const legendEntryKeys = createLegendEntryKeyIndex({
    model: () => runtime.model,
    keyAt: (i) => semanticKeys.keyAt(i),
  });

  // ---------------------------------------------------------- interaction
  // source rows/spec -> pipeline/scene + CandidateStore -> semantic resolver
  // -> chart-local reducer -> tooltip/crosshair/tools/callbacks. Presentation
  // consumes one resolved inspection and never reconstructs grouping itself.
  const interactive = $derived(interactionConfig.interactive);
  const surfaceInteractive = $derived(interactionConfig.availableTools.length > 0);

  // ------------------------------------------------- inspection
  // Construction-time deriveds may read the earlier model. Phased effects
  // register later via registerInspectionEffects().
  // Reversed deps: reducer / clearBrush / chooseTool close over the later-
  // declared surfaceState (handler/effect-only; construction guard).
  const inspectionState = createInspectionState({
    model: () => runtime.model,
    // Deferred: surface owns the reducer (handler/effect only).
    reducer: () => surfaceState.reducer,
    inspectConfig: () => interactionConfig.inspect,
    inspectEnabled: () => inspectEnabled,
    dataIdentityEpoch: () => dataIdentityEpoch,
    // Deferred: semantic-key service is declared later (handler only).
    keyAt: (index) => semanticKeys.keyAt(index),
    root: inputs.root,
    captureSurface: inputs.captureSurface,
    plotId: () => inputs.plotId,
    tooltipHovered: () => tooltipHovered,
    clearTooltipHovered: () => {
      tooltipHovered = false;
    },
    clearBrush: () => {
      surfaceState.clearBrush();
    },
    chooseTool: (next) => {
      surfaceState.chooseTool(next);
    },
    oninspect: inputs.oninspect,
    oninteraction: inputs.oninteraction,
    announce: announceSink,
    clearAnnouncement: () => {
      announcer.clear();
    },
  });
  // ------------------------------------------------- surface
  // Construction-time deriveds read module-internal state + inspectConfig.
  // Sibling controllers, sinks, and chrome getters are handler/effect-only.
  // Phased effects register later via registerSurfaceEffects().
  const surfaceState = createSurfaceState({
    model: () => runtime.model,
    coordFlipped: () => coordFlipped,
    root: inputs.root,
    toolProp: () => inputs.tool(),
    initialTool: () => interactionConfig.initialTool,
    // Deferred: chrome availableTools (handler/effect only).
    availableTools: () => chromeState.availableTools,
    inspectConfig: () => interactionConfig.inspect,
    selectConfig: () => interactionConfig.select,
    // Deferred: chrome canPublishPointSelection (handler only).
    pointSelectEnabled: () => chromeState.canPublishPointSelection,
    ontoolchange: () => inputs.ontoolchange(),
    surfaceInteractive: () => surfaceInteractive,
    // Deferred: semantic-key service initializes later (issue #165).
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    inspection: () => inspectionState,
    // Deferred: interval is declared after surface (handler only).
    interval: () => intervalState,
    zoom: () => zoomState,
    // Deferred: selection controller is declared after surface (handler only).
    emitSelection: (event) => {
      selectionState.emitSelection(event);
    },
    // Deferred: semantic-key service is declared later (handler only).
    semanticKey: (row, index) => semanticKey(row, index),
    // Deferred: selection controller is declared after surface (handler only).
    togglePointKeys: (keys, source) => {
      selectionState.togglePointKeys(keys, source);
    },
    tooltipHovered: () => tooltipHovered,
    announce: announceSink,
  });
  const coordFlipped = $derived(assembled?.coord?.type === "flip");
  let tooltipHovered = $state(false);
  // ------------------------------------------------- selection
  // Construction-time effectiveSelectedKeys reads earlier interaction/scope
  // only. The later runtime projection module owns anchors and masks.
  const selectionState = createSelectionState({
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    onselect: inputs.onselect,
    oninteraction: inputs.oninteraction,
    announce: announceSink,
  });
  // Shared enablement predicates (avoid re-typing the same config gates).
  const inspectEnabled = $derived(interactionConfig.inspect !== null);
  const legendFocusEnabled = $derived(interactionConfig.legendFocus !== null);
  // ------------------------------------------------- legend focus
  // Factory sits after the enablement cluster so construction-time
  // effectiveEmphasisKeys closes over earlier bindings only.
  const legendFocusState = createLegendFocusState({
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    legendFocusEnabled: () => legendFocusEnabled,
    legendFocusPreviewEnabled: () => interactionConfig.legendFocus?.preview === true,
    root: inputs.root,
    entryKeys: () => legendEntryKeys,
    entries: () => interactiveLegendEntries,
    // Deferred read of the later-declared cached derived (handlers only).
    pressed: () => effectiveLegendPressed,
    onlegendfocus: inputs.onlegendfocus,
    oninteraction: inputs.oninteraction,
    announce: announceSink,
  });
  // ------------------------------------------------- interval selection
  // Construction-time deriveds may read model/effectiveZoomDomains (both
  // earlier-declared). Effects register here — relative order is runtime
  // model effects < interval effects < semantic diagnostics.
  const intervalState = createIntervalState({
    model: () => runtime.model,
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    // Direct construction edges (not deferred thunks): zoom + selection
    // are already constructed when interval is built.
    commitZoom: (...args: Parameters<PlotZoomState["commitZoom"]>) => {
      zoomState.commitZoom(...args);
    },
    coordFlipped: () => coordFlipped,
    captureSurface: inputs.captureSurface,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    // Deferred: the projection module is constructed immediately after interval.
    consumptionCandidates: () => semanticCandidateProjection.intervalConsumptionCandidates,
    inspectionPanel: () => inspectionState.inspectionPanel,
    emitSelection: (...args: Parameters<SelectionState["emitSelection"]>) => {
      selectionState.emitSelection(...args);
    },
    announce: announceSink,
  });
  const semanticCandidateProjection = createSemanticCandidateProjection({
    model: () => runtime.model,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    selectedKeys: () => selectionState.effectiveSelectedKeys,
    intervalKeys: () => intervalState.effectiveIntervalKeys,
    intervals: () => intervalState.effectiveIntervals,
    emphasisKeys: () => legendFocusState.effectiveEmphasisKeys,
    inspectionFocus: () => {
      const current = inspectionState.inspection;
      return current === null
        ? null
        : {
            sourceKeys: current.focus.sourceKeys,
            key: current.focus.key,
          };
    },
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
    width: () => inputs.width(),
    resolvedWidth: () => runtime.resolvedWidth,
    resolvedHeight: () => runtime.resolvedHeight,
  });
  // Semantic diagnostics effects (before host diagnostic / surface effects).
  semanticKeys.registerEffects();

  $effect(() => {
    for (const diagnostic of chromeState.areaScaleDiagnostics) deliverDiagnostic(diagnostic);
  });

  $effect(() => {
    for (const diagnostic of chromeState.legendDiagnostics) deliverDiagnostic(diagnostic);
  });

  // Surface window-teardown + tool-sync (after diagnostics, before catalog/
  // focus/inspection registrations).
  surfaceState.registerSurfaceEffects();

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
  const legendClearActive = $derived(legendFocusEnabled && effectiveLegendPressed !== null);

  // Host-side derived kept outside the factory (construction-time free of
  // the model read).
  const filterableLegendEntries = $derived(legendFilterState.computeEntries(runtime.model));
  // Catalog reconcile after model effects.
  legendFilterState.registerCatalogEffects(() => filterableLegendEntries);
  // Legend-focus reconcile after catalog.
  legendFocusState.registerReconcileEffects();
  // Inspection disposal + scene reconcile after legend-focus.
  inspectionState.registerInspectionEffects();

  // clientFlush/ready effect at end of script (late registration).
  runtime.registerLateEffects();

  return {
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

    get assembled() {
      return assembled;
    },
    get interactionConfig() {
      return interactionConfig;
    },
    get interactive() {
      return interactive;
    },
    get surfaceInteractive() {
      return surfaceInteractive;
    },
    get coordFlipped() {
      return coordFlipped;
    },
    get legendFocusEnabled() {
      return legendFocusEnabled;
    },
    get selectedAnchors() {
      return semanticCandidateProjection.selectedAnchors;
    },
    get emphasizedAnchors() {
      return semanticCandidateProjection.emphasizedAnchors;
    },
    get interactionMasks() {
      return semanticCandidateProjection.interactionMasks;
    },
    get interactiveLegendEntries() {
      return interactiveLegendEntries;
    },
    get effectiveLegendPressed() {
      return effectiveLegendPressed;
    },
    get legendClearActive() {
      return legendClearActive;
    },
    get filterableLegendEntries() {
      return filterableLegendEntries;
    },
    get tooltipHovered() {
      return tooltipHovered;
    },
    set tooltipHovered(value: boolean) {
      tooltipHovered = value;
    },
  };
}
