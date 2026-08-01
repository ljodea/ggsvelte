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
 * Residual late bindings (definite-assignment / late hooks only where the
 * cycle is real):
 * - surfaceState! — inspection needs the surface reducer; surface needs
 *   inspection handlers
 * - semanticCandidateProjection! — interval consumptionCandidates close over
 *   the projection built after legend focus
 * - legendFocusState.installHostDerivedEffects() — host $derived entry lists
 *   require this factory's compute* methods (#627)
 *
 * Surface tool enablement (`availableTools`, point-select) is host-derived
 * before surface construction so chrome is not a surface construction-time
 * dep (#1082). Chrome recomputes the same pure formulas for UI consumers.
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
  identityFromSelectInput,
  pickExplicitDatumKey,
  resolveDatumKey,
} from "./runtime/resolve-datum-key.js";
import {
  collectCompositionDiagnostics,
  compositionAdvisoryDedupKey,
  type CompositionDiagnostic,
} from "./diagnostics/composition.js";
import type { PlotDiagnostic } from "./diagnostics/deprecation.js";
import type { LayerRegistry } from "./geoms/registry.svelte.js";
import {
  canPublishPointSelection,
  resolveFilteredAvailableTools,
} from "./interaction/capability.js";
import {
  inspectAxisOnBarColDiagnostics,
  layerGeomsFromSpecLayers,
  normalizeInteractionConfig,
  type InteractionDiagnostic,
  type PlotInteractionScope,
  type ResolvedInteractionConfig,
} from "./interaction/interaction.js";
import {
  createCapabilityResolution,
  ssrSafeDerived,
} from "./interaction/capability-resolution.svelte.js";
import {
  droppedInspectIdentityDiagnostics,
  duplicateInspectCapabilityDiagnostics,
} from "./interaction/resolve-inspect-capability.js";
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
import { filterFilterableLegendEntries } from "./legend/resolve-legend-filter.js";
import { filterInteractiveLegendEntries } from "./legend/resolve-legend-focus.js";
import { createPlotChromeState } from "./chrome/chrome-state.svelte.js";
import type { PlotChromeState } from "./chrome/chrome-state.svelte.js";
import { isHostPlotLayer } from "./layers/types.js";
import { deprecatedPropDiagnostic } from "./diagnostics/deprecation.js";
import {
  readLegacyPlotKey,
  readLegacyPlotLegendFilter,
  readLegacyPlotLegendFocus,
  type EnginePlotProps,
} from "./plot-props.js";
import { createPlotAnnouncer } from "./runtime/announcer.svelte.js";
import type { PlotAnnouncer } from "./runtime/announcer.svelte.js";
import { createPlotRuntime } from "./runtime/runtime.svelte.js";
import type { PlotRuntime } from "./runtime/runtime.svelte.js";
import { createSemanticCandidateProjection } from "./runtime/semantic-candidate-projection.svelte.js";
import {
  buildDataIdentityEpochInput,
  dataIdentityEpochToken,
} from "./runtime/semantic-data-identity.js";
import { createSourceIdentityTracker } from "./runtime/semantic-source-identity.js";
import {
  createSemanticKeyService,
  type SemanticKeyService,
} from "./runtime/semantic-keys.svelte.js";
import { createSelectionState } from "./selection/selection-state.svelte.js";
import type { SelectionState } from "./selection/selection-state.svelte.js";
import {
  hoverChromeForKind,
  type PresentationAnchor,
  type PresentationChrome,
} from "./selection/selection.js";
import {
  crosshairGlyphObstacles,
  glyphExtentsFromBatch,
  type CrosshairGapBox,
} from "./scene/geometry.js";
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
  /** Measured glyph box when hoverChrome is `"box"`. */
  readonly hoverBoxWidth: number | undefined;
  readonly hoverBoxHeight: number | undefined;
  readonly hoverBoxAnchor: "start" | "middle" | "end" | undefined;
  /**
   * Sibling GeomText AABBs in the focus panel for crosshair hard-gaps (#1207).
   * Derived from scene batches (not candidate store) so uninspectable labels
   * still clear the guide.
   */
  readonly crosshairGapObstacles: readonly CrosshairGapBox[];
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
  // Capability resolution seam (inspect / legendFocus / legendFilter / caps):
  // three independent SSR-safe deriveds behind one factory — see
  // capability-resolution.svelte.ts for the capabilityVersion-vs-version
  // isolation contract and the SSR one-pass recompute rationale.
  const capabilityResolution = createCapabilityResolution({
    registry: host.registry,
    props: host.props,
  });
  const inspectResolved = capabilityResolution.inspect;
  const legendFocusResolved = capabilityResolution.legendFocus;
  const legendFilterResolved = capabilityResolution.legendFilter;
  const caps = capabilityResolution.caps;

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
      // Grammar only — host-only kinds (legendFocus) never fold into PortableSpec.
      plotLayers: host.registry.layers.filter(
        (layer) => layer.kind !== "mark" && !isHostPlotLayer(layer),
      ),
      ...(a11y !== undefined && { a11y }),
    });
  }

  // SSR one-pass recompute rationale lives on ssrSafeDerived (#982).
  const assembled: () => PortableSpec | null = ssrSafeDerived(assembleCurrentSpec);

  // Facet intent: registry facet plot layer (<FacetWrap/> / <FacetGrid/> / <Facet/>),
  // OR assembled.facet (portable-spec embeds). Grammar props removed in 0.13.0 (#704).
  const facetedPlot = $derived(
    isFacetedPlotIntent({
      plotLayers: host.registry.layers,
      assembled: assembled(),
    }),
  );

  /**
   * Durable row identity: Inspect / Select / controller `identity` first,
   * then deprecated GGPlot `key`, else auto `id` column, else row index.
   * Always defined — ordinary charts need no custom identity.
   */
  function resolvedDatumKeyNow() {
    const data = host.props.data;
    const embedded = assembled()?.data;
    // The capability seam resolves this — do not re-read it off `input`, which
    // cannot tell a dropped prop identity from one that was never set.
    const inspectIdentity = inspectResolved().identity;
    const selectIdentity = identityFromSelectInput(host.props.select);
    const controllerIdentity = host.props.interaction?.identity;
    const legacyKey = readLegacyPlotKey(host.props);
    // exactOptionalPropertyTypes: omit keys rather than pass `undefined`.
    const explicit = pickExplicitDatumKey({
      ...(inspectIdentity !== undefined && { inspect: inspectIdentity }),
      ...(selectIdentity !== undefined && { select: selectIdentity }),
      ...(controllerIdentity !== undefined && { controller: controllerIdentity }),
      ...(legacyKey !== undefined && { legacy: legacyKey }),
    });
    return resolveDatumKey({
      ...(explicit !== undefined && { explicit }),
      data: data ?? embedded,
    });
  }
  const resolvedDatumKey = ssrSafeDerived(resolvedDatumKeyNow);

  const resolvedInteractionScope: PlotInteractionScope = $derived(
    (() => {
      const interaction = host.props.interaction;
      const interactionScope = host.props.interactionScope;
      const datumKey = resolvedDatumKey();
      return resolveInteractionScope({
        interaction,
        ...(interactionScope !== undefined && { interactionScope }),
        // Single-field default — do not call caps() (would subscribe all five).
        zoom: host.props.zoom ?? false,
        faceted: facetedPlot,
        datumKey,
        assembled: assembled(),
      });
    })(),
  );

  // interactionConfig: inspect from prop + <Inspect> children; legendFocus from
  // GuideLegend (host registry). SSR hatch matches assembled / inspectResolved.
  function interactionConfigCurrent(): ResolvedInteractionConfig {
    const tool = host.props.tool;
    // Four fields only — legendFilter is not part of normalizeInteractionConfig.
    // Reading it via caps() re-delivered config diagnostics on every filter toggle.
    return normalizeInteractionConfig(
      {
        inspect: inspectResolved().input,
        select: host.props.select ?? false,
        zoom: host.props.zoom ?? false,
        legendFocus: legendFocusResolved().configInput,
        ...(tool !== undefined && { tool }),
      },
      {
        faceted: facetedPlot,
        // Defaults always resolve a datum key (id column or row index).
        hasKey: true,
      },
    );
  }
  const interactionConfig: () => ResolvedInteractionConfig =
    ssrSafeDerived(interactionConfigCurrent);

  function deliverDiagnostic(diagnostic: PlotDiagnostic): void {
    const ondiagnostic = host.props.ondiagnostic;
    ondiagnostic?.(diagnostic);
    const nodeEnvironment = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process
      ?.env?.NODE_ENV;
    if (nodeEnvironment !== "production" && ondiagnostic === undefined)
      console.warn(`[ggsvelte:${diagnostic.code}] ${diagnostic.message}`);
  }

  $effect(() => {
    for (const diagnostic of interactionConfig().diagnostics) deliverDiagnostic(diagnostic);
  });

  // Wiring advisories (ADR 0013 audit): prop combinations that silently do
  // nothing. Unlike config diagnostics (re-delivered per recompute), these
  // fire once per prop per plot instance — a later capability toggle must
  // not re-advise. Pure collect lives in wiring-advisories.ts; snapshot is
  // taken inside this derived so late-bound handlers still recompute.
  // capabilities.inspect is resolved (prop + <Inspect> children), not raw prop.
  const wiringDiagnostics = $derived.by((): InteractionDiagnostic[] => {
    const capabilities = caps();
    // legendFocus "requested" is the GuideLegend/child (or deprecated prop)
    // opt-in — not the post-key-check resolved config — so keyless focus does
    // not double-advise HANDLER_WITHOUT_CAPABILITY + LEGEND_REQUIRES_KEY.
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
        legendFocus: legendFocusResolved().requested,
        // legendFilter "requested" is GuideLegend/child (or deprecated prop)
        // opt-in — not resolveCapabilities(plot prop alone).
        legendFilter: legendFilterResolved().requested,
      },
    });
  });
  // Shared once-per-dedup-key Set for wiring + multi-Inspect + deprecations +
  // composition + inspect-geom. Each deliverAdvisoriesOnce call registers ONE
  // $effect; call order below is the registration (and first-flush delivery)
  // order. Re-delivering effects (config diagnostics above, chrome area/legend
  // diagnostics later) stay outside this helper by design.
  const deliveredAdvisories = new Set<string>();
  function deliverAdvisoriesOnce<T extends PlotDiagnostic>(
    get: () => readonly T[],
    dedupKeyOf: (diagnostic: T) => string = (diagnostic) =>
      `${diagnostic.code}:${(diagnostic as { prop?: string }).prop}`,
  ): void {
    $effect(() => {
      for (const diagnostic of get()) {
        const dedupKey = dedupKeyOf(diagnostic);
        if (deliveredAdvisories.has(dedupKey)) continue;
        deliveredAdvisories.add(dedupKey);
        deliverDiagnostic(diagnostic);
      }
    });
  }

  deliverAdvisoriesOnce(() => wiringDiagnostics);

  // Multiple <Inspect> children: last wins; advisory once per mount.
  const multiInspectDiagnostics = $derived.by((): InteractionDiagnostic[] =>
    duplicateInspectCapabilityDiagnostics(inspectResolved().multiChild),
  );
  deliverAdvisoriesOnce(() => multiInspectDiagnostics);

  // <Inspect> replaced an inspect prop that named `identity`: rows silently
  // fell back to id column / row index before #1305's follow-up.
  const droppedIdentityDiagnostics = $derived.by((): InteractionDiagnostic[] =>
    droppedInspectIdentityDiagnostics(inspectResolved().droppedPropIdentity),
  );
  deliverAdvisoriesOnce(() => droppedIdentityDiagnostics);

  // Deprecated plot-level key → Inspect / Select / controller identity.
  const deprecatedKeyDiagnostics = $derived.by((): PlotDiagnostic[] => {
    const plotProp = readLegacyPlotKey(host.props);
    if (plotProp === undefined) return [];
    return [
      deprecatedPropDiagnostic({
        prop: "key",
        since: "0.21.0",
        removeIn: "0.22.0",
        suggestions: [
          'Use <Inspect identity="year" /> (or inspect={{ identity: "year" }})',
          'Use select={{ type: "point", identity: "year" }} when selection owns the key',
          'Use createPlotInteraction({ identity: "year" }) for linked controllers',
        ],
        anchor: "row-identity-on-interaction",
      }),
    ];
  });
  deliverAdvisoriesOnce(() => deprecatedKeyDiagnostics);

  // Deprecated plot-level legendFocus → GuideLegend.focus (one minor window).
  const deprecatedLegendFocusDiagnostics = $derived.by((): PlotDiagnostic[] => {
    const plotProp = readLegacyPlotLegendFocus(host.props);
    if (plotProp === undefined || plotProp === false) return [];
    return [
      deprecatedPropDiagnostic({
        prop: "legendFocus",
        since: "0.19.0",
        removeIn: "0.20.0",
        suggestions: [
          'Use <GuideLegend channel="color" focus /> (or the aesthetic that owns the discrete legend)',
          "focus={{ preview: false }} on GuideLegend replaces legendFocus={{ preview: false }}",
        ],
        anchor: "legend-focus-on-guidelegend",
      }),
    ];
  });
  deliverAdvisoriesOnce(() => deprecatedLegendFocusDiagnostics);

  // Deprecated plot-level legendFilter → GuideLegend.filter (one minor window).
  const deprecatedLegendFilterDiagnostics = $derived.by((): PlotDiagnostic[] => {
    const plotProp = readLegacyPlotLegendFilter(host.props);
    if (plotProp === undefined || plotProp === false) return [];
    return [
      deprecatedPropDiagnostic({
        prop: "legendFilter",
        since: "0.19.0",
        removeIn: "0.20.0",
        suggestions: [
          'Use <GuideLegend channel="color" filter /> (or the aesthetic that owns the discrete legend)',
          'filter={{ mode: "include", multiple: false }} on GuideLegend replaces legendFilter={{ … }}',
        ],
        anchor: "legend-filter-on-guidelegend",
      }),
    ];
  });
  deliverAdvisoriesOnce(() => deprecatedLegendFilterDiagnostics);

  // Composition advisories (#659 slices 3+5+6): pure collect over
  // registry.layers. Last child still wins (shallow merge / last write);
  // delivery is once-per-dedup-key via compositionAdvisoryDedupKey.
  const compositionDiagnostics = $derived.by((): CompositionDiagnostic[] =>
    collectCompositionDiagnostics(host.registry.layers),
  );
  deliverAdvisoriesOnce(() => compositionDiagnostics, compositionAdvisoryDedupKey);

  // Inspect axis guides that fight bar/col geometry (or bisect on-bar labels).
  // Needs assembled layers + resolved inspect.mode; once-per-code:prop like wiring.
  const inspectGeomDiagnostics = $derived.by((): InteractionDiagnostic[] => {
    const mode = interactionConfig().inspect?.mode;
    if (mode === undefined) return [];
    return inspectAxisOnBarColDiagnostics(mode, layerGeomsFromSpecLayers(assembled()?.layers));
  });
  deliverAdvisoriesOnce(() => inspectGeomDiagnostics);

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
    zoomConfig: () => interactionConfig().zoom,
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
    // GuideLegend children (or deprecated plot prop) — not plot prop alone.
    legendFilterProp: () => legendFilterResolved().configInput,
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
    datumKey: () => resolvedDatumKey(),
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
  const interactive = $derived(interactionConfig().interactive);
  const surfaceInteractive = $derived(interactionConfig().availableTools.length > 0);

  // Shared enablement predicates (avoid re-typing the same config gates).
  const inspectEnabled = $derived(interactionConfig().inspect !== null);
  const legendFocusEnabled = $derived(interactionConfig().legendFocus !== null);
  const coordFlipped = $derived(assembled()?.coord?.type === "flip");
  let tooltipHovered = $state(false);

  // ------------------------------------------------- selection
  // Before surface so emit/toggle are direct (not deferred sibling getters).
  const selectionState = createSelectionState({
    interaction: () => host.props.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig().select,
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
    inspectConfig: () => interactionConfig().inspect,
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
    selectConfig: () => interactionConfig().select,
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
  // getters for those. Tool enablement is host-derived (same pure formulas as
  // chrome) so surface does not close over later chromeState (#1082).
  const surfaceAvailableTools = $derived(
    resolveFilteredAvailableTools(
      interactionConfig().availableTools,
      interactionConfig().zoom,
      runtime.model?.scales ?? null,
    ),
  );
  const surfacePointSelectEnabled = $derived(canPublishPointSelection(interactionConfig().select));
  surfaceState = createSurfaceState({
    model: () => runtime.model,
    root: host.root,
    toolProp: () => host.props.tool,
    initialTool: () => interactionConfig().initialTool,
    availableTools: () => surfaceAvailableTools,
    inspectConfig: () => interactionConfig().inspect,
    selectConfig: () => interactionConfig().select,
    pointSelectEnabled: () => surfacePointSelectEnabled,
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
    legendFocusPreviewEnabled: () => interactionConfig().legendFocus?.preview === true,
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
    muteSiblingsOnInspect: () => interactionConfig().inspect?.muteSiblings === true,
    // Inspection owns the projection (#1080); wiring no longer re-assembles it.
    inspectionFocus: () => inspectionState.presentationFocus,
  });
  // ------------------------------------------------- plot chrome
  // All host bindings earlier-declared. Pure construction-time deriveds —
  // no $state/handlers/effects. No longer a surface construction-time dep
  // (#1082); availableTools / canPublishPointSelection stay chrome-owned for
  // UI, recomputed with the same pure helpers as surfaceAvailableTools above.
  const chromeState = createPlotChromeState({
    model: () => runtime.model,
    zoomConfig: () => interactionConfig().zoom,
    selectConfig: () => interactionConfig().select,
    configuredAvailableTools: () => interactionConfig().availableTools,
    interactionDiagnostics: () => interactionConfig().diagnostics,
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
  // the model read). Channel filter: only aesthetics with GuideLegend focus
  // (merged legends match via aesthetics[], not primary scale alone).
  const interactiveLegendEntries = $derived(
    filterInteractiveLegendEntries(
      legendFocusState.computeInteractiveEntries(runtime.model),
      legendFocusResolved().channels,
    ),
  );

  const effectiveLegendPressed: LegendEntryIdentity | null = $derived(
    legendFocusState.computeLegendPressed(runtime.model),
  );

  // Signal that the legend clear control is visible (right of the scene).
  // No longer couples to a bottom-row layout margin.
  const legendClearActive = $derived(legendFocusEnabled && effectiveLegendPressed !== null);

  // Host-side derived for catalog reconcile (closes over runtime.model).
  // Channel filter: only aesthetics with GuideLegend filter (merged legends
  // match via aesthetics[], not primary scale alone).
  const filterableLegendEntries = $derived(
    filterFilterableLegendEntries(
      legendFilterState.computeEntries(runtime.model),
      legendFilterResolved().channels,
    ),
  );

  function hoverGlyphExtents(): {
    readonly width: number;
    readonly height: number;
    readonly textAnchor: "start" | "middle" | "end";
  } | null {
    const seed = inspectionState.inspectionSeed;
    const model = runtime.model;
    if (seed === null || model === null || seed.kind !== "glyphs") return null;
    const batch = model.scene.batches[seed.batchIndex];
    if (batch === undefined || batch.kind !== "glyphs") return null;
    return glyphExtentsFromBatch(batch, seed.primitiveIndex);
  }

  // Scene walk (not candidate store): uninspectable label layers still paint
  // and still need guide gaps (#1065 / #1207). Depends on (scene, panelId)
  // only — not the focus anchor — so this is a real $derived, not a per-read
  // getter like hoverGlyphExtents.
  const EMPTY_CROSSHAIR_GAP_OBSTACLES: readonly CrosshairGapBox[] = Object.freeze([]);
  const crosshairGapObstacles = $derived.by((): readonly CrosshairGapBox[] => {
    const model = runtime.model;
    const panel = inspectionState.inspectionPanel;
    if (model === null || panel === null) return EMPTY_CROSSHAIR_GAP_OBSTACLES;
    return crosshairGlyphObstacles(model.scene.batches, model.scene.panels, panel.id);
  });

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
      return interactionConfig();
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
      // Hover chrome is separate from selection/emphasis anchor rings: open
      // path strokes still gap the crosshair; rects and closed path fills
      // (areas) mute (#1270). Null inspection → default ring.
      const focus = inspectionState.presentationFocus;
      if (focus === null) return "ring";
      const seed = inspectionState.inspectionSeed;
      const batch = seed === null ? undefined : runtime.model?.scene.batches[seed.batchIndex];
      const closedPath = batch?.kind === "paths" && batch.closed === true;
      return hoverChromeForKind(focus.kind, closedPath);
    },
    get hoverBoxWidth() {
      return hoverGlyphExtents()?.width;
    },
    get hoverBoxHeight() {
      return hoverGlyphExtents()?.height;
    },
    get hoverBoxAnchor() {
      return hoverGlyphExtents()?.textAnchor;
    },
    get crosshairGapObstacles() {
      return crosshairGapObstacles;
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
