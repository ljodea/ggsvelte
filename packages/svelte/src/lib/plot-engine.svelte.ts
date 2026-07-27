/**
 * Plot engine — controller wiring + host-level deriveds for <GGPlot>.
 *
 * Ownership
 * ---------
 * GGPlot owns: root, captureSurface, a11yTableOpen, plotId (component runes /
 *   bind:this / $props.id / markup-only state). Context (`provideRegistry`) and
 *   `$props()` also stay in the component.
 * Engine owns: tooltipHovered, host-level assemble/interaction deriveds, all
 *   controller construction, and phased effect registration.
 *
 * Construction / effect-order contract
 * ------------------------------------
 * Construction order is the topological order of direct construction-time
 * reads; effect registration sequence is load-bearing. Deferred thunks break
 * the runtime cycles (surface ↔ inspection ↔ interval ↔ selection). This
 * module preserves the pre-S11 top-to-bottom declaration order from GGPlot.
 *
 * Cross-module transition side effects (e.g. inspection dismiss → brush/tool)
 * are applied via `applyInspectionDismissSideEffects` at the surface call site
 * (#627). Leaf modules register their own effects at construction; the engine
 * only wires host-held deriveds into catalog reconcile where data is not
 * available at leaf construction time.
 *
 * Call `createPlotEngine` once during component init so every `$effect`
 * registers in the component effect tree. No `$props`, `$props.id()`, or
 * context calls live here.
 */
import type { BatchInteractionMask, CellValue, RenderModel } from "@ggsvelte/core";
import type {
  A11yMode,
  AesInput,
  CoordSpec,
  DataInput,
  FacetInput,
  GuidesSpec,
  Labs,
  LayerInput,
  LegendSpec,
  PortableSpec,
  Scales,
  SpecInput,
  ThemeName,
  ThemeSpec,
} from "@ggsvelte/spec";

import {
  assemblePortableSpec,
  isFacetedPlotIntent,
  resolveInteractionScope,
  toLayerInput,
} from "./assembly/assemble.js";
import {
  collectCompositionDiagnostics,
  compositionAdvisoryDedupKey,
  type CompositionDiagnostic,
} from "./diagnostics/composition.js";
import {
  deprecatedPropDiagnostic,
  type DeprecationDiagnostic,
  type PlotDiagnostic,
} from "./diagnostics/deprecation.js";
import type { LayerRegistry } from "./geoms/registry.svelte.js";
import type { PlotInteractionController } from "./interaction/controller.svelte.js";
import {
  normalizeInteractionConfig,
  type InspectInput,
  type InteractionDiagnostic,
  type InteractionTool,
  type LegendFocusEvent,
  type LegendFocusInput,
  type PlotInspection,
  type PlotInteractionEvent,
  type PlotInteractionScope,
  type PlotSelection,
  type ResolvedInteractionConfig,
  type SelectInput,
  type ZoomEvent,
  type ZoomInput,
} from "./interaction/interaction.js";
import { collectWiringDiagnostics } from "./interaction/wiring-advisories.js";
import { createInspectionState } from "./inspection/inspection-state.svelte.js";
import type { InspectionState } from "./inspection/inspection-state.svelte.js";
import { createIntervalState } from "./interval/interval-state.svelte.js";
import type { IntervalState } from "./interval/interval-state.svelte.js";
import { grammarDeprecationInputs } from "./layers/grammar-families.js";
import type { LegendFilterEvent, LegendFilterInput } from "./legend/filter.js";
import { createLegendEntryKeyIndex } from "./legend/entry-key-index.svelte.js";
import { createLegendFilterState } from "./legend/filter-state.svelte.js";
import type { FilterableLegendEntry, LegendFilterState } from "./legend/filter-state.svelte.js";
import type { InteractiveLegendEntry, LegendEntryIdentity } from "./legend/focus.js";
import { createLegendFocusState } from "./legend/focus-state.svelte.js";
import type { LegendFocusState } from "./legend/focus-state.svelte.js";
import { createPlotChromeState } from "./chrome/chrome-state.svelte.js";
import type { PlotChromeState } from "./chrome/chrome-state.svelte.js";
import { createPlotAnnouncer } from "./runtime/announcer.svelte.js";
import type { PlotAnnouncer } from "./runtime/announcer.svelte.js";
import { createPlotRuntime } from "./runtime/runtime.svelte.js";
import type { PlotRuntime } from "./runtime/runtime.svelte.js";
import { createSemanticCandidateProjection } from "./runtime/semantic-candidate-projection.svelte.js";
import { createSourceIdentityTracker, dataIdentityEpochToken } from "./runtime/semantic-keys.js";
import {
  createSemanticKeyService,
  type SemanticKeyService,
} from "./runtime/semantic-keys.svelte.js";
import { createSelectionState } from "./selection/selection-state.svelte.js";
import type { SelectionState } from "./selection/selection-state.svelte.js";
import {
  presentationChromeForKind,
  type PresentationAnchor,
  type PresentationChrome,
} from "./selection/selection.js";
import { createSurfaceState } from "./surface/surface-state.svelte.js";
import type { SurfaceState } from "./surface/surface-state.svelte.js";
import { createPlotZoomState } from "./zoom/zoom-state.svelte.js";
import type { PlotZoomState } from "./zoom/zoom-state.svelte.js";

// ---------------------------------------------------------------------------
// Inputs / return type
// ---------------------------------------------------------------------------

export type PlotEngineInputs<
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
  guides: () => GuidesSpec | undefined;
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
  ondiagnostic: () => ((diagnostic: PlotDiagnostic) => void) | undefined;
  ontoolchange: () => ((tool: InteractionTool) => void) | undefined;
  onrender: () => ((model: RenderModel, spec: PortableSpec) => void) | undefined;
};

/**
 * Non-generic return surface. Controllers are stable object refs; deriveds
 * that markup reads are `get` accessors. Internal wiring (deliverDiagnostic,
 * inspectEnabled, facetedPlot, …) is not exposed.
 *
 * Defined once next to the factory that builds it — not hand-mirrored from a
 * second module (#982).
 */
export type PlotEngine = {
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
  readonly selectedAnchors: PresentationAnchor[];
  readonly emphasizedAnchors: PresentationAnchor[];
  readonly hoverChrome: PresentationChrome;
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

export function createPlotEngine<
  Row extends Record<string, CellValue> = Record<string, CellValue>,
  Identity extends keyof Row | ((row: Row, index: number) => PropertyKey) = keyof Row,
>(inputs: PlotEngineInputs<Row, Identity>): PlotEngine {
  // Reading descriptors through toLayerInput goes through live getters, so
  // geom prop changes flow into this $derived without re-registration.
  // Explicit `spec` short-circuits before registry/children so ignored props
  // do not become reactive dependencies of the assembled plot.
  function assembleCurrentSpec(): PortableSpec | null {
    const spec = inputs.spec();
    if (spec !== undefined) return assemblePortableSpec({ spec, layers: [] });
    const data = inputs.data();
    const mapping = inputs.mapping();
    const layers = inputs.layers();
    const facet = inputs.facet();
    const coord = inputs.coord();
    const scales = inputs.scales();
    const guides = inputs.guides();
    const legend = inputs.legend();
    const theme = inputs.theme();
    const labs = inputs.labs();
    const a11y = inputs.a11y();
    return assemblePortableSpec({
      ...(data !== undefined && { data }),
      ...(mapping !== undefined && { aes: mapping }),
      // Mark layers only: a `layers={[…]}` prop suppresses registry marks, not
      // non-mark plot layers (theme/scale/coord/facet/labs/guides/legend).
      layers: layers ?? inputs.registry.markLayers.map(toLayerInput),
      plotLayers: inputs.registry.layers.filter((layer) => layer.kind !== "mark"),
      ...(facet !== undefined && { facet }),
      ...(coord !== undefined && { coord }),
      ...(scales !== undefined && { scales }),
      ...(guides !== undefined && { guides }),
      ...(legend !== undefined && { legend }),
      ...(theme !== undefined && { theme }),
      ...(labs !== undefined && { labs }),
      ...(a11y !== undefined && { a11y }),
    });
  }

  // Svelte 5.33's one-pass SSR can cache a construction-time empty registry
  // before declaration children initialize. Recompute from the plain registry
  // on the server; client reads retain normal rune dependency tracking.
  // Single SSR guard for the whole engine (#982 — previously duplicated across
  // orchestrator + assembly).
  const assembledDerived: PortableSpec | null = $derived.by(assembleCurrentSpec);
  const assembled = (): PortableSpec | null =>
    typeof window === "undefined" ? assembleCurrentSpec() : assembledDerived;

  // Facet intent: raw prop (before layers register), registry facet plot layer
  // (<FacetWrap/> / <FacetGrid/> / <Facet/>), OR assembled.facet (portable-spec embeds).
  const facetedPlot = $derived(
    isFacetedPlotIntent({
      facet: inputs.facet(),
      plotLayers: inputs.registry.layers,
      assembled: assembled(),
    }),
  );

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
        assembled: assembled(),
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

  function deliverDiagnostic(diagnostic: PlotDiagnostic): void {
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
  // not re-advise. Pure collect lives in wiring-advisories.ts; snapshot is
  // taken inside this derived so late-bound handlers still recompute.
  const wiringDiagnostics = $derived.by((): InteractionDiagnostic[] =>
    collectWiringDiagnostics({
      interactionScope: inputs.interactionScope(),
      interaction: inputs.interaction(),
      handlers: {
        oninspect: inputs.oninspect(),
        onselect: inputs.onselect(),
        onzoom: inputs.onzoom(),
        onlegendfocus: inputs.onlegendfocus(),
        onlegendfilter: inputs.onlegendfilter(),
      },
      capabilities: {
        inspect: inputs.inspect(),
        select: inputs.select(),
        zoom: inputs.zoom(),
        legendFocus: inputs.legendFocus(),
        legendFilter: inputs.legendFilter(),
      },
    }),
  );
  // Shared once-per-code-per-prop Set for wiring + deprecation + composition.
  // Delivery order is fixed: config effect (above) → wiring → deprecation →
  // composition. Do not reorder these $effect registrations.
  const deliveredAdvisories = new Set<string>();
  $effect(() => {
    for (const diagnostic of wiringDiagnostics) {
      const dedupKey = `${diagnostic.code}:${diagnostic.prop}`;
      if (deliveredAdvisories.has(dedupKey)) continue;
      deliveredAdvisories.add(dedupKey);
      deliverDiagnostic(diagnostic);
    }
  });

  // Grammar-prop deprecations (#659 / #785): table-driven via GRAMMAR_FAMILIES.
  // One advisory per deprecated prop that is !== undefined. Decidable from
  // raw props — assembly does not participate. Reuses deliverDiagnostic and
  // the same code:prop dedup Set as wiring. Emission order is DEPRECATION_EMIT_ORDER.
  const deprecationDiagnostics = $derived.by((): DeprecationDiagnostic[] =>
    grammarDeprecationInputs({
      theme: inputs.theme,
      scales: inputs.scales,
      coord: inputs.coord,
      facet: inputs.facet,
      guides: inputs.guides,
      legend: inputs.legend,
      labs: inputs.labs,
    }).map((input) => deprecatedPropDiagnostic(input)),
  );
  $effect(() => {
    for (const diagnostic of deprecationDiagnostics) {
      const dedupKey = `${diagnostic.code}:${diagnostic.prop}`;
      if (deliveredAdvisories.has(dedupKey)) continue;
      deliveredAdvisories.add(dedupKey);
      deliverDiagnostic(diagnostic);
    }
  });

  // Composition advisories (#659 slices 3+5+6): pure collect over
  // registry.layers. Last child still wins (shallow merge / last write);
  // delivery is once-per-dedup-key via compositionAdvisoryDedupKey.
  const compositionDiagnostics = $derived.by((): CompositionDiagnostic[] =>
    collectCompositionDiagnostics(inputs.registry.layers),
  );
  $effect(() => {
    for (const diagnostic of compositionDiagnostics) {
      const dedupKey = compositionAdvisoryDedupKey(diagnostic);
      if (deliveredAdvisories.has(dedupKey)) continue;
      deliveredAdvisories.add(dedupKey);
      deliverDiagnostic(diagnostic);
    }
  });

  // The PublicKey → PropertyKey widening casts live at the GGPlot call site;
  // PlotEngineInputs is already declared in the widened form, so controller
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
    // MUST use markLayers (not layers): the widened Layer union has no `.data`
    // at the top level, so reading registry.layers would silently drop
    // layer-local data from the #609 epoch and make a theme-only plot
    // look "ready".
    const layerDescriptors =
      layers === undefined
        ? inputs.registry.markLayers
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
