/**
 * Plot orchestrator — controller wiring + host-level deriveds for <GGPlot>.
 *
 * Ownership
 * ---------
 * GGPlot owns: root, captureSurface, a11yTableOpen, plotId (component runes /
 *   bind:this / $props.id / markup-only state). Context (`provideRegistry`) and
 *   `$props()` also stay in the component.
 * Orchestrator owns: tooltipHovered and all controller construction, host
 *   deriveds, and phased effect registration.
 *
 * Construction / effect-order contract
 * ------------------------------------
 * Construction order is the topological order of direct construction-time
 * reads; effect registration sequence is load-bearing. Deferred thunks break
 * the runtime cycles (surface ↔ inspection ↔ interval ↔ selection). This
 * module preserves the pre-S11 top-to-bottom declaration order from GGPlot.
 *
 * Call `createPlotOrchestrator` once during component init so every `$effect`
 * registers in the component effect tree. No `$props`, `$props.id()`, or
 * context calls live here.
 */
import type { BatchInteractionMask, CellValue, RenderModel } from "@ggsvelte/core";
import { buildHitIndex, type SceneHitIndex } from "@ggsvelte/core/dom";
import type {
  A11yMode,
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  Labs,
  LayerInput,
  LegendSpec,
  PortableSpec,
  Scales,
  SpecInput,
  ThemeName,
  ThemeSpec,
} from "@ggsvelte/spec";

import type {
  InspectInput,
  InteractionDiagnostic,
  InteractionTool,
  LegendFocusEvent,
  LegendFocusInput,
  PlotInspection,
  PlotInteractionEvent,
  PlotInteractionScope,
  PlotSelection,
  ResolvedInteractionConfig,
  SelectInput,
  ZoomEvent,
  ZoomInput,
} from "./interaction/interaction.js";
import type { PlotInteractionController } from "./interaction/controller.svelte.js";
import {
  assemblePortableSpec,
  isFacetedPlotIntent,
  resolveInteractionScope,
  toLayerInput,
} from "./assembly/assemble.js";
import { createPlotAnnouncer, type PlotAnnouncer } from "./runtime/announcer.svelte.js";
import {
  createSourceIdentityTracker,
  createSemanticKeyService,
  dataIdentityEpochToken,
  type SemanticKeyService,
} from "./runtime/semantic-keys.svelte.js";
import { createPlotRuntime, type PlotRuntime } from "./runtime/runtime.svelte.js";
import { type InteractiveLegendEntry, type LegendEntryIdentity } from "./plot-legend-focus.js";
import {
  createLegendFilterState,
  type FilterableLegendEntry,
  type LegendFilterState,
} from "./legend-filter-state.svelte.js";
import { createLegendFocusState, type LegendFocusState } from "./legend-focus-state.svelte.js";
import { createPlotZoomState, type PlotZoomState } from "./zoom/zoom-state.svelte.js";
import { createIntervalState, type IntervalState } from "./interval/interval-state.svelte.js";
import {
  createInspectionState,
  type InspectionState,
} from "./inspection/inspection-state.svelte.js";
import { createSurfaceState, type SurfaceState } from "./surface/surface-state.svelte.js";
import { createSelectionState, type SelectionState } from "./selection/selection-state.svelte.js";
import { createPlotChromeState, type PlotChromeState } from "./chrome/chrome-state.svelte.js";
import type { LegendFilterEvent, LegendFilterInput } from "./legend-filter.js";
import type { LayerRegistry } from "./geoms/registry.svelte.js";
import { normalizeInteractionConfig } from "./interaction/interaction.js";

// ---------------------------------------------------------------------------
// Inputs / return type
// ---------------------------------------------------------------------------

export type OrchestratorInputs<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
> = {
  /** Value — created by `provideRegistry()` in GGPlot (context stays there). */
  registry: LayerRegistry;
  /** Plain string from `$props.id()` in GGPlot. */
  plotId: string;
  root: () => HTMLDivElement | null;
  captureSurface: () => HTMLDivElement | null;

  // Reactive props / callbacks as getter thunks (post-destructure names).
  spec: () => SpecInput | undefined;
  data: () => DataInput | readonly Row[] | undefined;
  mapping: () => AesInput | undefined;
  layers: () => LayerInput[] | undefined;
  facet: () => FacetInput | undefined;
  coord: () => CoordSpec | "flip" | undefined;
  scales: () => Scales | undefined;
  legend: () => LegendSpec | undefined;
  theme: () => ThemeName | ThemeSpec | undefined;
  labs: () => Labs | undefined;
  a11y: () => A11yMode | undefined;
  width: () => number | "container" | undefined;
  height: () => number | undefined;
  datumKey: () => Identity | undefined;
  /** Defaulted non-optional after destructure. */
  inspect: () => InspectInput;
  select: () => SelectInput;
  zoom: () => ZoomInput;
  legendFocus: () => LegendFocusInput;
  legendFilter: () => LegendFilterInput;
  tool: () => InteractionTool | undefined;
  // Widened to PropertyKey at the boundary — PublicKey is component-local.
  interaction: () => PlotInteractionController<PropertyKey> | undefined;
  interactionScope: () => PlotInteractionScope | undefined;
  oninspect: () => ((event: PlotInspection<Record<string, CellValue>>) => void) | undefined;
  onselect: () => ((event: PlotSelection) => void) | undefined;
  onzoom: () => ((event: ZoomEvent) => void) | undefined;
  onlegendfocus: () => ((event: LegendFocusEvent) => void) | undefined;
  onlegendfilter: () => ((event: LegendFilterEvent) => void) | undefined;
  oninteraction: () =>
    | ((event: PlotInteractionEvent<Record<string, CellValue>>) => void)
    | undefined;
  ondiagnostic: () => ((diagnostic: InteractionDiagnostic) => void) | undefined;
  ontoolchange: () => ((tool: InteractionTool) => void) | undefined;
  onrender: () => ((model: RenderModel, spec: PortableSpec) => void) | undefined;
};

/**
 * Non-generic return surface. Controllers are stable object refs; deriveds
 * that markup reads are `get` accessors. Internal wiring (deliverDiagnostic,
 * inspectEnabled, facetedPlot, factory* casts, …) is not exposed.
 */
export type PlotOrchestrator = {
  // Controllers (stable object references)
  readonly zoomState: PlotZoomState;
  readonly legendFilterState: LegendFilterState;
  readonly runtime: PlotRuntime;
  readonly inspectionState: InspectionState;
  readonly surfaceState: SurfaceState;
  readonly selectionState: SelectionState;
  readonly legendFocusState: LegendFocusState;
  readonly intervalState: IntervalState;
  readonly chromeState: PlotChromeState;
  readonly announcer: PlotAnnouncer;

  // Engine getter accessors — deriveds markup consumes
  readonly assembled: PortableSpec | null;
  readonly interactionConfig: ResolvedInteractionConfig;
  readonly interactive: boolean;
  readonly surfaceInteractive: boolean;
  readonly coordFlipped: boolean;
  readonly legendFocusEnabled: boolean;
  readonly selectedAnchors: { x: number; y: number }[];
  readonly emphasizedAnchors: { x: number; y: number }[];
  readonly interactionMasks: readonly (BatchInteractionMask | null)[];
  readonly interactiveLegendEntries: InteractiveLegendEntry[];
  readonly effectiveLegendPressed: LegendEntryIdentity | null;
  readonly legendClearActive: boolean;
  readonly filterableLegendEntries: FilterableLegendEntry[];

  // get/set tooltipHovered (owned here; markup handlers write via engine)
  tooltipHovered: boolean;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createPlotOrchestrator<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
>(inputs: OrchestratorInputs<Row, Identity>): PlotOrchestrator {
  // Reading descriptors through toLayerInput goes through live getters, so
  // geom prop changes flow into this $derived without re-registration.
  // Explicit `spec` short-circuits before registry/children so ignored props
  // do not become reactive dependencies of the assembled plot.
  const assembled: PortableSpec | null = $derived.by(() => {
    const spec = inputs.spec();
    if (spec !== undefined) return assemblePortableSpec({ spec, layers: [] });
    const data = inputs.data();
    const mapping = inputs.mapping();
    const layers = inputs.layers();
    const facet = inputs.facet();
    const coord = inputs.coord();
    const scales = inputs.scales();
    const legend = inputs.legend();
    const theme = inputs.theme();
    const labs = inputs.labs();
    const a11y = inputs.a11y();
    return assemblePortableSpec({
      ...(data !== undefined && { data }),
      ...(mapping !== undefined && { aes: mapping }),
      layers: layers ?? inputs.registry.layers.map(toLayerInput),
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
  const facetedPlot = $derived(isFacetedPlotIntent({ facet: inputs.facet(), assembled }));

  const resolvedInteractionScope: PlotInteractionScope = $derived(
    (() => {
      const interaction = inputs.interaction();
      const interactionScope = inputs.interactionScope();
      const zoom = inputs.zoom();
      const datumKey = inputs.datumKey();
      return resolveInteractionScope({
        interaction,
        ...(interactionScope !== undefined && { interactionScope }),
        zoom,
        faceted: facetedPlot,
        ...(datumKey !== undefined && { datumKey }),
        assembled,
      });
    })(),
  );

  const interactionConfig = $derived(
    (() => {
      const tool = inputs.tool();
      return normalizeInteractionConfig(
        {
          inspect: inputs.inspect(),
          select: inputs.select(),
          zoom: inputs.zoom(),
          legendFocus: inputs.legendFocus(),
          ...(tool !== undefined && { tool }),
        },
        {
          faceted: facetedPlot,
          hasKey: inputs.datumKey() !== undefined,
        },
      );
    })(),
  );

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

  // Source identity/order epoch: stable through responsive layout and zoom
  // respecs, different when normalized inline data or data references change.
  // Tracker is owned for the component lifetime (never cleared).
  const identityTracker = createSourceIdentityTracker();
  const dataIdentityEpoch = $derived(
    dataIdentityEpochToken({
      assembled,
      dataToken: identityTracker.sourceIdentity(inputs.data()),
      specToken: identityTracker.sourceIdentity(inputs.spec()),
    }),
  );

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

  // ---------------------------------------------------------- interaction
  // source rows/spec -> pipeline/scene -> hit index -> semantic resolver ->
  // chart-local reducer -> tooltip/crosshair/tools/callbacks. Presentation
  // consumes one resolved inspection and never reconstructs grouping itself.
  const interactive = $derived(interactionConfig.interactive);
  const surfaceInteractive = $derived(interactionConfig.availableTools.length > 0);
  const hitIndex: SceneHitIndex | null = $derived.by(() =>
    surfaceInteractive && runtime.model !== null ? buildHitIndex(runtime.model.scene) : null,
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
    hitIndex: () => hitIndex,
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
  // only. Anchors and masks are methods (later-declared inputs).
  const selectionState = createSelectionState({
    model: () => runtime.model,
    interaction: inputs.interaction,
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
    semanticKeys: () => semanticKeys,
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
    inspectionPanel: () => inspectionState.inspectionPanel,
    emitSelection: (...args: Parameters<SelectionState["emitSelection"]>) => {
      selectionState.emitSelection(...args);
    },
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
    width: () => inputs.width(),
    resolvedWidth: () => runtime.resolvedWidth,
    resolvedHeight: () => runtime.resolvedHeight,
  });
  // Method-call deriveds (not pure aliases) — keep as intermediate memos.
  const selectedAnchors = $derived(selectionState.computeSelectedAnchors());
  const emphasizedAnchors = $derived(selectionState.computeEmphasizedAnchors());

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

  // Three separate host deriveds — intermediate memo boundaries live here
  // (do NOT fold into one method).
  const presentationFocusKeys = $derived(selectionState.computePresentationFocusKeys());
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
      return selectedAnchors;
    },
    get emphasizedAnchors() {
      return emphasizedAnchors;
    },
    get interactionMasks() {
      return interactionMasks;
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
