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
import { createPlotZoomState } from "./zoom/zoom-state.svelte.js";
import { createIntervalState } from "./interval/interval-state.svelte.js";
import { createInspectionState } from "./inspection/inspection-state.svelte.js";
import { createSurfaceState } from "./surface/surface-state.svelte.js";
import { createSelectionState } from "./selection/selection-state.svelte.js";
import { presentationChromeForKind } from "./selection/selection.js";
import { createPlotChromeState } from "./chrome/chrome-state.svelte.js";
import {
  bindInteractionTransitionPort,
  type InteractionTransitionWiring,
} from "./interaction/transition-port.js";

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
  // reads; effect registration sequence is load-bearing. Deferred thunks break
  // the runtime cycles (surface ↔ inspection ↔ interval ↔ selection).

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

  const transitionWiring: InteractionTransitionWiring = {};
  const port = bindInteractionTransitionPort(transitionWiring);
  const effectRegistrars: Array<() => void> = [];
  const collectEffects = (attach: () => void): void => {
    effectRegistrars.push(attach);
  };

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
    assembled,
    effectiveSpec: () => zoomState.effectiveSpec,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    effectiveLegendFilters: () => legendFilterState.filters,
    root: inputs.root,
    resetZoom: () => {
      zoomState.resetForScales();
    },
    onrender: () => inputs.onrender(),
    onRegisterLateEffects: collectEffects,
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
    assembled,
    datumKey: () => inputs.datumKey(),
    data: () => inputs.data(),
    spec: () => inputs.spec(),
    sourceIdentity: (value: unknown) => identityTracker.sourceIdentity(value),
    deliverDiagnostic,
    onRegisterEffects: collectEffects,
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
  // Chart-local transitions route through one port; the owner registers phased
  // effects in deterministic order after sibling wiring is complete.
  const interactive = $derived(interactionConfig.interactive);
  const surfaceInteractive = $derived(interactionConfig.availableTools.length > 0);
  const inspectEnabled = $derived(interactionConfig.inspect !== null);
  const legendFocusEnabled = $derived(interactionConfig.legendFocus !== null);

  let tooltipHovered = $state(false);

  const selectionState = createSelectionState({
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    onselect: inputs.onselect,
    oninteraction: inputs.oninteraction,
    announce: announceSink,
  });
  transitionWiring.selection = selectionState;
  transitionWiring.zoom = zoomState;

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
    onRegisterEffects: collectEffects,
  });

  const intervalState = createIntervalState({
    model: () => runtime.model,
    port,
    interaction: inputs.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    captureSurface: inputs.captureSurface,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    consumptionCandidates: () => semanticCandidateProjection.intervalConsumptionCandidates,
    announce: announceSink,
  });
  transitionWiring.interval = intervalState;

  const inspectionState = createInspectionState({
    model: () => runtime.model,
    port,
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
    onRegisterEffects: collectEffects,
  });
  transitionWiring.inspection = inspectionState;

  const surfaceState = createSurfaceState({
    model: () => runtime.model,
    port,
    root: inputs.root,
    toolProp: () => inputs.tool(),
    initialTool: () => interactionConfig.initialTool,
    availableTools: () => chromeState.availableTools,
    inspectConfig: () => interactionConfig.inspect,
    selectConfig: () => interactionConfig.select,
    pointSelectEnabled: () => chromeState.canPublishPointSelection,
    ontoolchange: () => inputs.ontoolchange(),
    surfaceInteractive: () => surfaceInteractive,
    tooltipHovered: () => tooltipHovered,
    announce: announceSink,
    onRegisterEffects: collectEffects,
  });
  transitionWiring.surface = {
    reducer: surfaceState.reducer,
    activeTool: surfaceState.activeTool,
    clearBrush: () => surfaceState.clearBrush(),
    chooseTool: (next) => surfaceState.chooseTool(next),
    clearTouchInspectStart: () => surfaceState.clearTouchInspectStart(),
  };
  transitionWiring.semanticKey = semanticKey;
  transitionWiring.candidateSemanticKeys = candidateSemanticKeys;
  transitionWiring.model = () => runtime.model;

  const coordFlipped = $derived(assembled()?.coord?.type === "flip");
  const semanticCandidateProjection = createSemanticCandidateProjection({
    model: () => runtime.model,
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    selectedKeys: () => selectionState.effectiveSelectedKeys,
    intervalKeys: () => intervalState.effectiveIntervalKeys,
    intervals: () => intervalState.effectiveIntervals,
    emphasisKeys: () => legendFocusState.effectiveEmphasisKeys,
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
  $effect(() => {
    for (const diagnostic of chromeState.areaScaleDiagnostics) deliverDiagnostic(diagnostic);
  });

  $effect(() => {
    for (const diagnostic of chromeState.legendDiagnostics) deliverDiagnostic(diagnostic);
  });

  const interactiveLegendEntries = $derived(
    legendFocusState.computeInteractiveEntries(runtime.model),
  );

  const effectiveLegendPressed: LegendEntryIdentity | null = $derived(
    legendFocusState.computeLegendPressed(runtime.model),
  );

  const legendClearActive = $derived(legendFocusEnabled && effectiveLegendPressed !== null);

  const filterableLegendEntries = $derived(legendFilterState.computeEntries(runtime.model));

  effectRegistrars.push(() =>
    legendFilterState.attachCatalogEffects(() => filterableLegendEntries),
  );

  for (const attach of effectRegistrars) attach();

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
