/**
 * Deep plot-interaction assembly.
 *
 * Owns controller construction and shared Candidate projection. Cross-module
 * transition side effects (e.g. inspection dismiss → brush/tool) are applied
 * via `applyInspectionDismissSideEffects` at the surface call site (#627).
 * Leaf modules register their own effects at construction; assembly only
 * wires host-held deriveds into catalog reconcile where data is not available
 * at leaf construction time.
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
import { createSourceIdentityTracker, dataIdentityEpochToken } from "./runtime/semantic-keys.js";
import {
  createSemanticKeyService,
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
import { presentationChromeForKind } from "./selection/selection.js";
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
  const assembledDerived = $derived(deps.assembled());
  const assembled = (): PortableSpec | null =>
    typeof window === "undefined" ? deps.assembled() : assembledDerived;
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
  // reads. Cross-module dismiss tails go through transition-owner at the
  // surface call site; leaf effects register at construction (#627).

  // ------------------------------------------------------------ zoom respec
  // Construction-time deriveds read interaction/scope/zoomConfig/assembled
  // only — model/announce are deferred getters (later-declared).
  const zoomState = createPlotZoomState({
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    zoomConfig: () => interactionConfig.zoom,
    assembled,
    // Model is declared after the runtime; handlers only.
    model: () => runtime.model,
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
    // Declaration children expose live data getters via the registry.
    const layerDescriptors =
      layers === undefined
        ? inputs.registry.layers
        : layers.map((layer) => ({ data: (layer as { data?: unknown }).data }));
    const layerCount = layerDescriptors.length;
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
    // Layer-local data must participate: a plot with only geom-child data and
    // no plot data/spec prop would otherwise keep a stable epoch across row
    // replacements (#609).
    return dataIdentityEpochToken({
      ready,
      dataToken: sourceIdentity(data),
      specToken: sourceIdentity(spec),
      data: contentData ?? null,
      datasets: contentDatasets ?? null,
      layers: layerDescriptors,
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
    // model / catalogEntries close over later bindings (effect-only; not
    // construction-time reads).
    model: () => runtime.model,
    catalogEntries: () => filterableLegendEntries,
  });

  // ------------------------------------------------- plot runtime
  // Factory sits after zoom-respec and legend-filter so every direct
  // construction-time dep is already initialized (TDZ).
  const runtime = createPlotRuntime({
    widthProp: () => inputs.width(),
    heightProp: () => inputs.height(),
    assembled,
    effectiveSpec: () => zoomState.effectiveSpec,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    effectiveLegendFilters: () => legendFilterState.filters,
    root: inputs.root,
    resetZoom: () => {
      zoomState.resetForScales();
    },
    onrender: () => inputs.onrender(),
  });
  // Semantic resolution as soon as the runtime model exists. Early
  // construction makes interval projection safe when a shared controller
  // arrives with pre-populated non-union intervals (#165).
  const semanticKeys = createSemanticKeyService({
    model: () => runtime.model,
    assembled,
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

  // Shared enablement predicates (avoid re-typing the same config gates).
  const inspectEnabled = $derived(interactionConfig.inspect !== null);
  const legendFocusEnabled = $derived(interactionConfig.legendFocus !== null);
  const coordFlipped = $derived(assembled()?.coord?.type === "flip");
  let tooltipHovered = $state(false);

  // ------------------------------------------------- selection
  // Before surface so emit/toggle are direct (not deferred sibling getters).
  const selectionState = createSelectionState({
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    onselect: inputs.onselect,
    oninteraction: inputs.oninteraction,
    announce: announceSink,
  });

  // ------------------------------------------------- inspection
  // Reducer is still owned by surface (created next). Inspection takes a
  // deferred reducer getter only for that TDZ edge; clearBrush/chooseTool are
  // NOT wired here — surface applies dismiss plan tails via transition-owner.
  let surfaceState!: ReturnType<typeof createSurfaceState>;
  const inspectionState = createInspectionState({
    model: () => runtime.model,
    reducer: () => surfaceState.reducer,
    inspectConfig: () => interactionConfig.inspect,
    inspectEnabled: () => inspectEnabled,
    dataIdentityEpoch: () => dataIdentityEpoch,
    keyAt: (index) => semanticKeys.keyAt(index),
    root: inputs.root,
    captureSurface: inputs.captureSurface,
    plotId: () => inputs.plotId,
    tooltipHovered: () => tooltipHovered,
    clearTooltipHovered: () => {
      tooltipHovered = false;
    },
    oninspect: inputs.oninspect,
    oninteraction: inputs.oninteraction,
    announce: announceSink,
    clearAnnouncement: () => {
      announcer.clear();
    },
  });

  // ------------------------------------------------- interval selection
  // Before surface so finishBrushSelect is a direct ref (not deferred).
  // consumptionCandidates still late-binds the projection module.
  let semanticCandidateProjection!: ReturnType<typeof createSemanticCandidateProjection>;
  const intervalState = createIntervalState({
    model: () => runtime.model,
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    commitZoom: (...args: Parameters<PlotZoomState["commitZoom"]>) => {
      zoomState.commitZoom(...args);
    },
    captureSurface: inputs.captureSurface,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    consumptionCandidates: () => semanticCandidateProjection.intervalConsumptionCandidates,
    inspectionPanel: () => inspectionState.inspectionPanel,
    emitSelection: (...args: Parameters<SelectionState["emitSelection"]>) => {
      selectionState.emitSelection(...args);
    },
    announce: announceSink,
  });

  // ------------------------------------------------- surface
  // Inspection + interval + selection already constructed — no sibling TDZ
  // getters for those. Chrome availableTools / pointSelect still late.
  let chromeState!: ReturnType<typeof createPlotChromeState>;
  surfaceState = createSurfaceState({
    model: () => runtime.model,
    root: inputs.root,
    toolProp: () => inputs.tool(),
    initialTool: () => interactionConfig.initialTool,
    availableTools: () => chromeState.availableTools,
    inspectConfig: () => interactionConfig.inspect,
    selectConfig: () => interactionConfig.select,
    pointSelectEnabled: () => chromeState.canPublishPointSelection,
    ontoolchange: () => inputs.ontoolchange(),
    surfaceInteractive: () => surfaceInteractive,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    inspection: () => inspectionState,
    interval: () => intervalState,
    zoom: () => zoomState,
    emitSelection: (event) => {
      selectionState.emitSelection(event);
    },
    semanticKey: (row, index) => semanticKey(row, index),
    togglePointKeys: (keys, source) => {
      selectionState.togglePointKeys(keys, source);
    },
    tooltipHovered: () => tooltipHovered,
    announce: announceSink,
  });

  // ------------------------------------------------- legend focus
  // Host-held entry lists are $derived after this factory; effects that read
  // them install via installHostDerivedEffects (irreducible late data, not a
  // sibling-controller cycle — #627).
  const legendFocusState = createLegendFocusState({
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    legendFocusEnabled: () => legendFocusEnabled,
    legendFocusPreviewEnabled: () => interactionConfig.legendFocus?.preview === true,
    root: inputs.root,
    entryKeys: () => legendEntryKeys,
    entries: () => interactiveLegendEntries,
    pressed: () => effectiveLegendPressed,
    onlegendfocus: inputs.onlegendfocus,
    oninteraction: inputs.oninteraction,
    announce: announceSink,
  });
  semanticCandidateProjection = createSemanticCandidateProjection({
    model: () => runtime.model,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    selectedKeys: () => selectionState.effectiveSelectedKeys,
    intervalKeys: () => intervalState.effectiveIntervalKeys,
    intervals: () => intervalState.effectiveIntervals,
    emphasisKeys: () => legendFocusState.effectiveEmphasisKeys,
    muteSiblingsOnInspect: () => interactionConfig.inspect?.muteSiblings === true,
    inspectionFocus: () => {
      const current = inspectionState.inspection;
      const seed = inspectionState.inspectionSeed;
      if (current === null) return null;
      return {
        sourceKeys: current.focus.sourceKeys,
        key: current.focus.key,
        kind: seed?.kind ?? null,
        primitives:
          seed === null
            ? []
            : Object.freeze([
                {
                  batchIndex: seed.batchIndex,
                  primitiveIndex: seed.primitiveIndex,
                },
              ]),
      };
    },
  });
  // ------------------------------------------------- plot chrome
  // All inputs earlier-declared. Pure construction-time deriveds —
  // no $state/handlers/effects.
  chromeState = createPlotChromeState({
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

  $effect(() => {
    for (const diagnostic of chromeState.areaScaleDiagnostics) deliverDiagnostic(diagnostic);
  });

  $effect(() => {
    for (const diagnostic of chromeState.legendDiagnostics) deliverDiagnostic(diagnostic);
  });

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

  // Host-side derived for catalog reconcile (closes over runtime.model).
  const filterableLegendEntries = $derived(legendFilterState.computeEntries(runtime.model));

  // After host entry deriveds exist (irreducible late data for legend focus).
  legendFocusState.installHostDerivedEffects();

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
      return assembled();
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
    get hoverChrome() {
      // Read inspection $state so chrome updates with seed (plain let).
      if (inspectionState.inspection === null) return "ring";
      return presentationChromeForKind(inspectionState.inspectionSeed?.kind);
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
