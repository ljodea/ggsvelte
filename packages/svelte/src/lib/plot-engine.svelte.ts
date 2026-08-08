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
 * The five interaction controllers (zoom / selection / interval / surface /
 * inspection) are constructed by the two-phase interaction assembly
 * (interaction/interaction-states.svelte.ts): phase 1 builds zoom before the
 * legend-filter / runtime chain; phase 2 (`complete`) builds the model-
 * reading controllers after the runtime + semantic-key service, because SSR
 * evaluates $derived eagerly at construction. The assembly owns sibling
 * ports internally. Shared deps flow through one InteractionContext
 * (interaction/interaction-context.svelte.ts) instead of per-factory
 * hand-wired bags. Leaf modules register their own effects at
 * construction; the engine only wires host-held deriveds into catalog
 * reconcile where data is not available at leaf construction time.
 *
 * Residual late bindings (definite-assignment / late hooks only where the
 * cycle is real):
 * - semanticCandidateProjection! — interval consumptionCandidates close over
 *   the projection, which itself reads the assembled states
 * - legendFocusState.installHostDerivedEffects() — host $derived entry lists
 *   require this factory's compute* methods (#627)
 *
 * Surface tool enablement (`availableTools`, point-select) is host-derived
 * before the assembly so chrome is not a surface construction-time dep
 * (#1082). Chrome recomputes the same pure formulas for UI consumers.
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
  discreteColorFillDomainSizes,
  inspectAxisOnBarColDiagnostics,
  inspectAxisOnDistributionDiagnostics,
  inspectHighCardinalityDiagnostics,
  layerGeomsFromSpecLayers,
  normalizeInteractionConfig,
  type InteractionDiagnostic,
  type PlotInteractionScope,
  type ResolvedInteractionConfig,
} from "./interaction/interaction.js";
import { resolveInteractionContext } from "./interaction/interaction-context.svelte.js";
import { createInteractionAssembly } from "./interaction/interaction-states.svelte.js";
import {
  createCapabilityResolution,
  ssrSafeDerived,
} from "./interaction/capability-resolution.svelte.js";
import {
  droppedInspectIdentityDiagnostics,
  duplicateInspectCapabilityDiagnostics,
} from "./interaction/resolve-inspect-capability.js";
import { collectWiringDiagnostics } from "./interaction/wiring-advisories.js";
import type { InspectionState } from "./inspection/inspection-state.svelte.js";
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
import { createSemanticKeyService } from "./runtime/semantic-keys.svelte.js";
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
import type { SurfaceState } from "./surface/surface-state.svelte.js";
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

  // PublicKey → PropertyKey widening lives in widenPlotProps (plot-props.ts).
  // Controllers read host.props handlers directly (already widened).
  // Announcer is declared later; the sink is handler-only (never construction).
  const announceSink = (message: string): void => {
    announcer.announce(message);
  };

  // Cross-module dismiss tails go through transition-owner at the surface
  // call site; leaf effects register at construction (#627). The interaction
  // assembly owns controller construction order.

  // ------------------------------------------------- interaction deriveds
  // Shared enablement predicates (avoid re-typing the same config gates).
  const interactive = $derived(interactionConfig().interactive);
  const surfaceInteractive = $derived(interactionConfig().availableTools.length > 0);
  const inspectEnabled = $derived(interactionConfig().inspect !== null);
  const legendFocusEnabled = $derived(interactionConfig().legendFocus !== null);
  const coordFlipped = $derived(assembled()?.coord?.type === "flip");
  let tooltipHovered = $state(false);

  // ------------------------------------------------- interaction context
  // One shared bag replaces the ~60 hand-wired dep fields the five controller
  // factories used to declare individually. Model / semantic-key getters are
  // handler-only deferred closures over later declarations (runtime,
  // semanticKeys) — never read at construction.
  const interactionContext = resolveInteractionContext({
    model: () => runtime.model,
    root: host.root,
    captureSurface: host.captureSurface,
    interaction: () => host.props.interaction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig().select,
    inspectConfig: () => interactionConfig().inspect,
    tooltipHovered: () => tooltipHovered,
    announce: announceSink,
    oninteraction: () => host.props.oninteraction,
    oninspect: () => host.props.oninspect,
    onselect: () => host.props.onselect,
    onzoom: () => host.props.onzoom,
    ontoolchange: () => host.props.ontoolchange,
    keyAt: (index) => semanticKeys.keyAt(index),
    semanticKey: (row, index) => semanticKeys.semanticKey(row, index),
    candidateSemanticKeys: (candidate) => semanticKeys.candidateSemanticKeys(candidate),
  });

  // ------------------------------------------------- interaction assembly (phase 1)
  // Zoom is the only controller the legend-filter / runtime chain reads.
  // SSR evaluates $derived eagerly at construction, so the model-reading
  // controllers (selection / interval / surface / inspection) must wait for
  // the runtime — phase 2 (`complete`) runs after semanticKeys below.
  const interactionAssembly = createInteractionAssembly(interactionContext, {
    zoom: {
      zoomConfig: () => interactionConfig().zoom,
      assembled,
    },
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
    effectiveSpec: () => interactionAssembly.zoom.effectiveSpec,
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
  // Factory sits after the interaction assembly and legend-filter so every direct
  // construction-time dep is already initialized (TDZ).
  const runtime = createPlotRuntime({
    widthProp: () => host.props.width,
    heightProp: () => host.props.height,
    assembled,
    effectiveSpec: () => interactionAssembly.zoom.effectiveSpec,
    effectiveZoomDomains: () => interactionAssembly.zoom.effectiveZoomDomains,
    effectiveLegendFilters: () => legendFilterState.filters,
    root: host.root,
    resetZoom: () => {
      interactionAssembly.zoom.resetForScales();
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

  // Legend entry → key index (lifted from semantic-keys in S16). Same relative
  // construction position as the derived it replaces — after semanticKeys,
  // before inspection — so the construction-order DAG is unchanged.
  const legendEntryKeys = createLegendEntryKeyIndex({
    model: () => runtime.model,
    keyAt: (i) => semanticKeys.keyAt(i),
  });

  // source rows/spec -> pipeline/scene + CandidateStore -> semantic resolver
  // -> chart-local reducer -> tooltip/crosshair/tools/callbacks. Presentation
  // consumes one resolved inspection and never reconstructs grouping itself.

  // Surface tool enablement is host-derived (same pure formulas as chrome) so
  // surface does not close over later chromeState (#1082). Declared after the
  // runtime (direct model read); the assembly reads them lazily via options.
  const surfaceAvailableTools = $derived(
    resolveFilteredAvailableTools(
      interactionConfig().availableTools,
      interactionConfig().zoom,
      runtime.model?.scales ?? null,
    ),
  );
  const surfacePointSelectEnabled = $derived(canPublishPointSelection(interactionConfig().select));

  // ------------------------------------------------- interaction assembly (phase 2)
  // selection → interval → surface → inspection, sibling ports wired inside
  // the assembly. The projection is the one remaining late binding: interval
  // consumption closes over it, and it needs the assembled states —
  // handler-only reads (#165 pattern).
  let semanticCandidateProjection!: ReturnType<typeof createSemanticCandidateProjection>;
  const states = interactionAssembly.complete({
    interval: {
      consumptionCandidates: () => semanticCandidateProjection.intervalConsumptionCandidates,
    },
    surface: {
      toolProp: () => host.props.tool,
      initialTool: () => interactionConfig().initialTool,
      availableTools: () => surfaceAvailableTools,
      pointSelectEnabled: () => surfacePointSelectEnabled,
      surfaceInteractive: () => surfaceInteractive,
    },
    inspection: {
      inspectEnabled: () => inspectEnabled,
      dataIdentityEpoch: () => dataIdentityEpoch,
      plotId: () => host.plotId,
      clearTooltipHovered: () => {
        tooltipHovered = false;
      },
      clearAnnouncement: () => {
        announcer.clear();
      },
    },
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
    candidateSemanticKeys: (candidate) => semanticKeys.candidateSemanticKeys(candidate),
    selectedKeys: () => states.selection.effectiveSelectedKeys,
    intervalKeys: () => states.interval.effectiveIntervalKeys,
    intervals: () => states.interval.effectiveIntervals,
    emphasisKeys: () => legendFocusState.effectiveEmphasisKeys,
    muteSiblingsOnInspect: () => interactionConfig().inspect?.muteSiblings === true,
    // Inspection owns the projection (#1080); wiring no longer re-assembles it.
    inspectionFocus: () => states.inspection.presentationFocus,
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
    effectiveZoomDomains: () => states.zoom.effectiveZoomDomains,
    effectiveIntervals: () => states.interval.effectiveIntervals,
    effectiveSelectedKeys: () => states.selection.effectiveSelectedKeys,
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

  // Inspect axis guides that fight bar/col geometry (or bisect on-bar labels)
  // and freescrolling guides through distribution/interval band geoms (#1528).
  // After runtime so trained scales gate interval-geom advisories (continuous
  // shared-x line+errorbar with mode="x" stays silent). Mode x/xy still fire
  // under coord_flip (#1409): the band-axis guide remains.
  const inspectGeomDiagnostics = $derived.by((): InteractionDiagnostic[] => {
    const mode = interactionConfig().inspect?.mode;
    if (mode === undefined) return [];
    const geoms = layerGeomsFromSpecLayers(assembled()?.layers);
    const scales = runtime.model?.scales;
    const discreteBandAxis =
      scales !== undefined && (scales.x.type === "band" || scales.y.type === "band");
    return [
      ...inspectAxisOnBarColDiagnostics(mode, geoms),
      ...inspectAxisOnDistributionDiagnostics(mode, geoms, { discreteBandAxis }),
    ];
  });
  deliverAdvisoriesOnce(() => inspectGeomDiagnostics);

  // High-cardinality discrete color/fill + inspect: default tooltip policy
  // advisory (#1274). Needs trained scales (runtime.model); once-per-channel.
  const inspectHighCardinality = $derived.by((): InteractionDiagnostic[] => {
    // Resolved inspect is null when off (never undefined) — see normalizeInteractionConfig.
    if (interactionConfig().inspect === null) return [];
    const model = runtime.model;
    if (model === null) return [];
    return inspectHighCardinalityDiagnostics({
      inspectEnabled: true,
      domainSizes: discreteColorFillDomainSizes(model.scales),
    });
  });
  deliverAdvisoriesOnce(() => inspectHighCardinality);

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
    const seed = states.inspection.inspectionSeed;
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
    const panel = states.inspection.inspectionPanel;
    if (model === null || panel === null) return EMPTY_CROSSHAIR_GAP_OBSTACLES;
    return crosshairGlyphObstacles(model.scene.batches, model.scene.panels, panel.id);
  });

  // After host entry deriveds exist (irreducible late data for legend focus).
  legendFocusState.installHostDerivedEffects();

  return {
    zoomState: states.zoom,
    legendFilterState,
    runtime,
    inspectionState: states.inspection,
    surfaceState: states.surface,
    selectionState: states.selection,
    legendFocusState,
    intervalState: states.interval,
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
      const focus = states.inspection.presentationFocus;
      if (focus === null) return "ring";
      const seed = states.inspection.inspectionSeed;
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
