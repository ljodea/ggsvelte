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
import type { BatchInteractionMask } from "@ggsvelte/core";
import type { PortableSpec } from "@ggsvelte/spec";

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
import type { PlotDiagnostic } from "./diagnostics/deprecation.js";
import type { LayerRegistry } from "./geoms/registry.svelte.js";
import {
  normalizeInteractionConfig,
  type InteractionDiagnostic,
  type PlotInteractionScope,
  type ResolvedInteractionConfig,
} from "./interaction/interaction.js";
import { collectWiringDiagnostics } from "./interaction/wiring-advisories.js";
import { createInspectionState } from "./inspection/inspection-state.svelte.js";
import type { InspectionState } from "./inspection/inspection-state.svelte.js";
import { createIntervalState } from "./interval/interval-state.svelte.js";
import type { IntervalState } from "./interval/interval-state.svelte.js";
import { createLegendEntryKeyIndex } from "./legend/entry-key-index.svelte.js";
import { createLegendFilterState } from "./legend/filter-state.svelte.js";
import type { FilterableLegendEntry, LegendFilterState } from "./legend/filter-state.svelte.js";
import type { InteractiveLegendEntry, LegendEntryIdentity } from "./legend/focus.js";
import { createLegendFocusState } from "./legend/focus-state.svelte.js";
import type { LegendFocusState } from "./legend/focus-state.svelte.js";
import { createPlotChromeState } from "./chrome/chrome-state.svelte.js";
import type { PlotChromeState } from "./chrome/chrome-state.svelte.js";
import {
  resolveCapabilities,
  type EnginePlotProps,
  type ResolvedPlotCapabilities,
} from "./plot-props.js";
import { createPlotAnnouncer } from "./runtime/announcer.svelte.js";
import type { PlotAnnouncer } from "./runtime/announcer.svelte.js";
import { createPlotRuntime } from "./runtime/runtime.svelte.js";
import type { PlotRuntime } from "./runtime/runtime.svelte.js";
import { createSemanticCandidateProjection } from "./runtime/semantic-candidate-projection.svelte.js";
import {
  buildDataIdentityEpochInput,
  createSourceIdentityTracker,
  dataIdentityEpochToken,
} from "./runtime/semantic-keys.js";
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
// Host / return type
// ---------------------------------------------------------------------------

/**
 * Host binding for the plot engine (#1040). Props are a single lazy
 * `EnginePlotProps` surface (GGPlotProps with PublicKey fields widened) —
 * not a per-field thunk bag. Capability defaults live in `resolveCapabilities`.
 */
export type PlotEngineHost = {
  /** Value — created by `provideRegistry()` in GGPlot (context stays there). */
  registry: LayerRegistry;
  /** Plain string from `$props.id()` in GGPlot. */
  plotId: string;
  root: () => HTMLDivElement | null;
  captureSurface: () => HTMLDivElement | null;
  /** Live props proxy (or widenPlotProps view). Grammar is children-only (#704). */
  props: EnginePlotProps;
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

export function createPlotEngine(host: PlotEngineHost): PlotEngine {
  // Capability defaults — pure, lazy per read (do not materialize a full
  // props snapshot; per-field deps stay on host.props).
  const caps = (): ResolvedPlotCapabilities => resolveCapabilities(host.props);

  // Reading descriptors through toLayerInput goes through live getters, so
  // geom prop changes flow into this $derived without re-registration.
  // Explicit `spec` short-circuits before registry/children so ignored props
  // do not become reactive dependencies of the assembled plot.
  function assembleCurrentSpec(): PortableSpec | null {
    const spec = host.props.spec;
    if (spec !== undefined) return assemblePortableSpec({ spec, layers: [] });
    const data = host.props.data;
    const mapping = host.props.aes;
    const layers = host.props.layers;
    const a11y = host.props.a11y;
    return assemblePortableSpec({
      ...(data !== undefined && { data }),
      ...(mapping !== undefined && { aes: mapping }),
      // Mark layers only: a `layers={[…]}` prop suppresses registry marks, not
      // non-mark plot layers (theme/scale/coord/facet/labs/guides/legend).
      layers: layers ?? host.registry.markLayers.map(toLayerInput),
      plotLayers: host.registry.layers.filter((layer) => layer.kind !== "mark"),
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

  // Facet intent: registry facet plot layer (<FacetWrap/> / <FacetGrid/> / <Facet/>),
  // OR assembled.facet (portable-spec embeds). Grammar props removed in 0.13.0 (#704).
  const facetedPlot = $derived(
    isFacetedPlotIntent({
      plotLayers: host.registry.layers,
      assembled: assembled(),
    }),
  );

  const resolvedInteractionScope: PlotInteractionScope = $derived(
    (() => {
      const interaction = host.props.interaction;
      const interactionScope = host.props.interactionScope;
      const datumKey = host.props.key;
      return resolveInteractionScope({
        interaction,
        ...(interactionScope !== undefined && { interactionScope }),
        // Single-field default — do not call caps() (would subscribe all five).
        zoom: host.props.zoom ?? false,
        faceted: facetedPlot,
        ...(datumKey !== undefined && { datumKey }),
        assembled: assembled(),
      });
    })(),
  );

  const interactionConfig = $derived(
    (() => {
      const tool = host.props.tool;
      const capabilities = caps();
      return normalizeInteractionConfig(
        {
          inspect: capabilities.inspect,
          select: capabilities.select,
          zoom: capabilities.zoom,
          legendFocus: capabilities.legendFocus,
          ...(tool !== undefined && { tool }),
        },
        {
          faceted: facetedPlot,
          hasKey: host.props.key !== undefined,
        },
      );
    })(),
  );

  function deliverDiagnostic(diagnostic: PlotDiagnostic): void {
    const ondiagnostic = host.props.ondiagnostic;
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
  const wiringDiagnostics = $derived.by((): InteractionDiagnostic[] => {
    const capabilities = caps();
    return collectWiringDiagnostics({
      interactionScope: host.props.interactionScope,
      interaction: host.props.interaction,
      handlers: {
        oninspect: host.props.oninspect,
        onselect: host.props.onselect,
        onzoom: host.props.onzoom,
        onlegendfocus: host.props.onlegendfocus,
        onlegendfilter: host.props.onlegendfilter,
      },
      capabilities: {
        inspect: capabilities.inspect,
        select: capabilities.select,
        zoom: capabilities.zoom,
        legendFocus: capabilities.legendFocus,
        legendFilter: capabilities.legendFilter,
      },
    });
  });
  // Shared once-per-code-per-prop Set for wiring + composition.
  // Delivery order is fixed: config effect (above) → wiring → composition.
  // Grammar-prop deprecation emission removed in 0.13.0 (#704) — props gone.
  const deliveredAdvisories = new Set<string>();
  $effect(() => {
    for (const diagnostic of wiringDiagnostics) {
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
    collectCompositionDiagnostics(host.registry.layers),
  );
  $effect(() => {
    for (const diagnostic of compositionDiagnostics) {
      const dedupKey = compositionAdvisoryDedupKey(diagnostic);
      if (deliveredAdvisories.has(dedupKey)) continue;
      deliveredAdvisories.add(dedupKey);
      deliverDiagnostic(diagnostic);
    }
  });

  // PublicKey → PropertyKey widening lives in widenPlotProps (plot-props.ts).
  // Controllers read host.props handlers directly (already widened).
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
    interaction: () => host.props.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    zoomConfig: () => interactionConfig.zoom,
    assembled,
    // Model is declared after the runtime; handlers only.
    model: () => runtime.model,
    onzoom: () => host.props.onzoom,
    oninteraction: () => host.props.oninteraction,
    announce: announceSink,
  });

  // Source identity/order epoch: O(R) row-ref order over data/spec *props*
  // (not assembled shells). Theme/labs/scales respecs do not re-walk cells;
  // new prop references or in-place row-order changes still bump the epoch.
  // Tracker is owned for the component lifetime (never cleared).
  const identityTracker = createSourceIdentityTracker();
  // Source identity tracker stays here (component lifetime). Pure fingerprint
  // assembly lives in buildDataIdentityEpochInput (#852).
  const dataIdentityEpoch = $derived.by(() =>
    dataIdentityEpochToken(
      buildDataIdentityEpochInput({
        data: host.props.data,
        spec: host.props.spec,
        layers: host.props.layers,
        // Declaration children: markLayers only (not registry.layers) — #609.
        registryMarkLayers: host.registry.markLayers,
        sourceIdentity: (value: unknown) => identityTracker.sourceIdentity(value),
      }),
    ),
  );

  // Live-region announcer (owned early so legend-reset effects can call it).
  const announcer = createPlotAnnouncer();

  // ------------------------------------------------- legend filter
  // Construction-time deriveds read legendFilter/effectiveSpec only —
  // model is deferred (declared after the runtime).
  const legendFilterState = createLegendFilterState({
    effectiveSpec: () => zoomState.effectiveSpec,
    // Single-field default — avoid caps() so this derived only tracks legendFilter.
    legendFilterProp: () => host.props.legendFilter ?? false,
    onlegendfilter: () => host.props.onlegendfilter,
    oninteraction: () => host.props.oninteraction,
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
    widthProp: () => host.props.width,
    heightProp: () => host.props.height,
    assembled,
    effectiveSpec: () => zoomState.effectiveSpec,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    effectiveLegendFilters: () => legendFilterState.filters,
    root: host.root,
    resetZoom: () => {
      zoomState.resetForScales();
    },
    onrender: () => host.props.onrender,
  });
  // Semantic resolution as soon as the runtime model exists. Early
  // construction makes interval projection safe when a shared controller
  // arrives with pre-populated non-union intervals (#165).
  const semanticKeys = createSemanticKeyService({
    model: () => runtime.model,
    assembled,
    datumKey: () => host.props.key,
    data: () => host.props.data,
    spec: () => host.props.spec,
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
    interaction: () => host.props.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    onselect: () => host.props.onselect,
    oninteraction: () => host.props.oninteraction,
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
    root: host.root,
    captureSurface: host.captureSurface,
    plotId: () => host.plotId,
    tooltipHovered: () => tooltipHovered,
    clearTooltipHovered: () => {
      tooltipHovered = false;
    },
    oninspect: () => host.props.oninspect,
    oninteraction: () => host.props.oninteraction,
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
    interaction: () => host.props.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    effectiveZoomDomains: () => zoomState.effectiveZoomDomains,
    commitZoom: (...args: Parameters<PlotZoomState["commitZoom"]>) => {
      zoomState.commitZoom(...args);
    },
    captureSurface: host.captureSurface,
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
    root: host.root,
    toolProp: () => host.props.tool,
    initialTool: () => interactionConfig.initialTool,
    availableTools: () => chromeState.availableTools,
    inspectConfig: () => interactionConfig.inspect,
    selectConfig: () => interactionConfig.select,
    pointSelectEnabled: () => chromeState.canPublishPointSelection,
    ontoolchange: () => host.props.ontoolchange,
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
    interaction: () => host.props.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    legendFocusEnabled: () => legendFocusEnabled,
    legendFocusPreviewEnabled: () => interactionConfig.legendFocus?.preview === true,
    root: host.root,
    entryKeys: () => legendEntryKeys,
    entries: () => interactiveLegendEntries,
    pressed: () => effectiveLegendPressed,
    onlegendfocus: () => host.props.onlegendfocus,
    oninteraction: () => host.props.oninteraction,
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
  // All host bindings earlier-declared. Pure construction-time deriveds —
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
    width: () => host.props.width,
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
