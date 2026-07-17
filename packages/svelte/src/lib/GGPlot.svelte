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
  import type { Snippet } from "svelte";

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
  import type { CellValue, RenderModel } from "@ggsvelte/core";
  import { sceneLabel } from "@ggsvelte/core";
  import type { SceneHitIndex } from "@ggsvelte/core/dom";
  import { buildHitIndex } from "@ggsvelte/core/dom";

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
    type SelectInput,
    type ZoomDomains,
    type ZoomEvent,
    type ZoomInput,
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
  import {
    type LegendFilterEvent,
    type LegendFilterInput,
  } from "./legend-filter.js";

  type PublicKey = Identity extends keyof Row
    ? Extract<Row[Identity], PropertyKey>
    : Identity extends (row: Row, index: number) => infer Key
      ? Extract<Key, PropertyKey>
      : never;

  interface Props {
    /** A complete spec (bare-string channel shorthand allowed). Wins over the other props. */
    spec?: SpecInput;
    /** Data rows, columns, or a DataRef ({values}/{columns}/{name}). */
    data?: DataInput | readonly Row[];
    /** Plot-level aesthetic mapping (inherited by every layer). */
    aes?: AesInput;
    /** Layers (props-first canonical form). Wins over declaration-only children. */
    layers?: LayerInput[];
    /** Facet into small multiples (wrap or rows/cols grid). */
    facet?: FacetInput;
    /** Coordinate system ("flip" shorthand accepted). */
    coord?: CoordSpec | "flip";
    /** Per-scale configuration (types, domains, schemes, breaks, labels). */
    scales?: Scales;
    /** Legend options (order). */
    legend?: LegendSpec;
    /** Theme: a registered name or an object with role overrides. */
    theme?: ThemeName | ThemeSpec;
    /** Titles and axis labels. */
    labs?: Labs;
    /** Accessibility mode ("force-svg" keeps every layer as SVG marks). */
    a11y?: A11yMode;
    /** Plot width in px. Omitted is container-responsive. */
    width?: number | "container";
    /** Plot height in px (falls back to spec.height, then 400). */
    height?: number;
    /** Stable semantic identity used by public interaction payloads. */
    key?: Identity;
    /** Opt into inspection, its semantic crosshair, tooltip, and pinning. */
    inspect?: InspectInput;
    /** Opt into point or interval selection. */
    select?: SelectInput;
    /** Opt into brush zoom. */
    zoom?: ZoomInput;
    /** Opt into discrete legend preview, focus, and linked emphasis. */
    legendFocus?: LegendFocusInput;
    /** Opt into data-changing filtering through discrete legend controls. */
    legendFilter?: LegendFilterInput;
    /** Controlled initial/active tool. */
    tool?: InteractionTool;
    /** Optional durable semantic state shared with other plots and Svelte UI. */
    interaction?: PlotInteractionController<PublicKey>;
    /** Semantic identity for linked keys and positional domains. */
    interactionScope?: PlotInteractionScope;
    /** Accessible chart name; falls back to the plot title/generated label. */
    ariaLabel?: string;
    oninspect?: (event: PlotInspection<Row, PublicKey>) => void;
    onselect?: (event: PlotSelection<PublicKey>) => void;
    onzoom?: (event: ZoomEvent) => void;
    onlegendfocus?: (event: LegendFocusEvent<PublicKey>) => void;
    onlegendfilter?: (event: LegendFilterEvent) => void;
    oninteraction?: (event: PlotInteractionEvent<Row, PublicKey>) => void;
    ondiagnostic?: (diagnostic: InteractionDiagnostic) => void;
    ontoolchange?: (tool: InteractionTool) => void;
    /** Called after each committed render with the model (warnings,
     *  advisories, scales) and the normalized PortableSpec. */
    onrender?: (model: RenderModel, spec: PortableSpec) => void;
    children?: Snippet;
  }

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
  }: Props = $props();

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

  // ------------------------------------------------------------ zoom respec (S4)
  // Factory sits at the original zoom-respec region (before announcer /
  // runtime). Construction-time deriveds read interaction/scope/zoomConfig/
  // assembled only — never model/coordFlipped/announce (Svelte 5.29 server
  // evaluates $derived eagerly at construction).
  // controllerRevision deleted in S8 (selection reads revision directly).
  const zoomState = createPlotZoomState({
    interaction: () => factoryInteraction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    zoomConfig: () => interactionConfig.zoom,
    assembled: () => assembled,
    // model / coordFlipped declared after the runtime; handlers only.
    model: () => model,
    coordFlipped: () => coordFlipped,
    onzoom: () => onzoom,
    oninteraction: () => factoryOninteraction,
    announce: announceSink,
  });
  // One-line host aliases at original positions (server-eager order).
  const effectiveZoomDomains = $derived(zoomState.effectiveZoomDomains);
  const effectiveSpec = $derived(zoomState.effectiveSpec);

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

  // ------------------------------------------------- legend filter (S2)
  // Factory sits at the original legend-filter region (before the runtime).
  // Construction-time deriveds read legendFilter/effectiveSpec only — never
  // model (Svelte 5.29 server evaluates $derived eagerly at construction).
  const legendFilterState = createLegendFilterState({
    effectiveSpec: () => effectiveSpec,
    legendFilterProp: () => legendFilter,
    onlegendfilter: () => onlegendfilter,
    oninteraction: () => oninteraction,
    announce: announceSink,
    // model is declared after the runtime; the getter is only invoked from
    // late catalog effects (never at construction).
    model: () => model,
  });

  /**
   * Clear the committed scale state (grow-mode recovery: dropped categories
   * lose their reserved colors) and any brush zoom. The next render trains
   * scales fresh from the current data.
   */
  export function resetScales(): void {
    runtime.resetScales();
  }

  // ------------------------------------------------- plot runtime (S1)
  // The factory call sits AFTER the zoom-respec and legend-filter blocks:
  // on the oldest supported Svelte, SERVER deriveds evaluate eagerly at
  // construction, so every binding a dep getter closes over must already be
  // initialized here (consumer-compat SSR smoke enforces this). Client-side,
  // the ResizeObserver effect now registers after the legend-reset effects —
  // safe: the observer callback is async and shares no state with them.
  const runtime = createPlotRuntime({
    widthProp: () => width,
    heightProp: () => height,
    assembled: () => assembled,
    effectiveSpec: () => effectiveSpec,
    effectiveZoomDomains: () => effectiveZoomDomains,
    effectiveLegendFilters: () => legendFilterState.filters,
    root: () => root,
    resetZoom: () => zoomState.resetForScales(),
    onrender: () => onrender,
  });
  // Mechanical alias so existing call sites stay unchanged in S1.
  const model = $derived(runtime.model);
  const resolvedWidth = $derived(runtime.resolvedWidth);
  const resolvedHeight = $derived(runtime.resolvedHeight);
  const strata = $derived(runtime.strata);
  const hasCanvas = $derived(runtime.hasCanvas);
  // Phase 2: dispose + onrender after legend-reset effects (effect-order).
  runtime.registerModelEffects();

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
    surfaceInteractive && model !== null ? buildHitIndex(model.scene) : null,
  );

  // ------------------------------------------------- inspection (S6)
  // Factory at the original void-vars position (before the surface controller
  // that now owns the reducer). Construction-time deriveds may read model /
  // surfaceInteractive (both earlier). Phased effects register later at the
  // original coordinator site via registerInspectionEffects().
  // Reversed deps (S7): reducer / clearBrush / chooseTool close over the
  // later-declared surfaceState (handler/effect-only; construction guard).
  const inspectionState = createInspectionState({
    model: () => model,
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
  // ------------------------------------------------- surface (S7)
  // Factory at the original reducer position. Construction-time deriveds read
  // only module-internal state + inspectConfig. Sibling controllers, sinks,
  // and chrome getters are handler/effect-only. Phased effects register later
  // at the original line-810 site via registerSurfaceEffects().
  const surfaceState = createSurfaceState({
    model: () => model,
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
    // Deferred: semantic-key alias initializes later (issue #165).
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
  // Host one-liners at original positions for stays-behind consumers.
  const activeTool = $derived(surfaceState.activeTool);
  const surfaceDescription = $derived(surfaceState.surfaceDescription);
  const inspection = $derived(inspectionState.inspection);
  const inspectionPanel = $derived(inspectionState.inspectionPanel);
  const coordFlipped = $derived(assembled?.coord?.type === "flip");
  let tooltipHovered = $state(false);
  let captureSurface = $state<HTMLDivElement | null>(null);
  const brushRect = $derived(surfaceState.brushRect);
  const areaAwaitingSecond = $derived(surfaceState.areaAwaitingSecond);
  // ------------------------------------------------- selection (S8)
  // Factory at the original localSelectedKeys position. Construction-time
  // effectiveSelectedKeys reads earlier interaction/scope only. Anchors and
  // masks are methods (later-declared inputs).
  const selectionState = createSelectionState({
    model: () => model,
    interaction: () => factoryInteraction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    // Deferred: interval alias is declared after this factory (method only).
    effectiveIntervalKeys: () => effectiveIntervalKeys,
    // Deferred: legend-focus alias is declared after this factory (method only).
    effectiveEmphasisKeys: () => effectiveEmphasisKeys,
    // Deferred method-only projection of inspection focus for presentation masks.
    inspectionFocus: () =>
      inspection === null
        ? null
        : {
            sourceKeys: inspection.focus.sourceKeys,
            key: inspection.focus.key,
          },
    // Deferred: semantic-key alias initializes later (#165).
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    onselect: () => onselect as ((event: PlotSelection) => void) | undefined,
    oninteraction: () => factoryOninteraction,
    announce: announceSink,
  });
  // Host one-liner at original position for chrome / anchors / markup.
  const effectiveSelectedKeys = $derived(selectionState.effectiveSelectedKeys);
  // Shared enablement predicates (avoid re-typing the same config gates).
  const inspectEnabled = $derived(interactionConfig.inspect !== null);
  const legendFocusEnabled = $derived(interactionConfig.legendFocus !== null);
  // ------------------------------------------------- legend focus (S3)
  // Factory sits AFTER the enablement cluster: construction-time
  // effectiveEmphasisKeys closes over earlier bindings only (Svelte 5.29
  // server evaluates $derived eagerly at construction).
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
  // Host one-liner: downstream server-eager deriveds (capability gate,
  // emphasizedAnchors, presentationFocusKeys) read this at original sites.
  const effectiveEmphasisKeys = $derived(
    legendFocusState.effectiveEmphasisKeys,
  );
  // ------------------------------------------------- interval selection (S5)
  // Factory at the original interval region (after runtime + legend-focus).
  // Construction-time deriveds may read model/effectiveZoomDomains (both
  // earlier-declared). Both effects register here — relative order is
  // runtime model effects (529) < interval effects < semantic diagnostics.
  const intervalState = createIntervalState({
    model: () => model,
    interaction: () => factoryInteraction,
    resolvedInteractionScope: () => resolvedInteractionScope,
    selectConfig: () => interactionConfig.select,
    effectiveZoomDomains: () => effectiveZoomDomains,
    commitZoom: zoomState.commitZoom,
    coordFlipped: () => coordFlipped,
    captureSurface: () => captureSurface,
    // Deferred: host alias initializes after semantic-key service (issue #165).
    candidateSemanticKeys: (candidate) => candidateSemanticKeys(candidate),
    inspectionPanel: () => inspectionPanel,
    // Selection is already constructed (interval is after selection).
    emitSelection: (event) => selectionState.emitSelection(event),
    announce: announceSink,
  });
  // Host one-liners at original positions for later consumers.
  const effectiveIntervals = $derived(intervalState.effectiveIntervals);
  const effectiveIntervalKeys = $derived(intervalState.effectiveIntervalKeys);
  // ------------------------------------------------- plot chrome (S8)
  // Factory at the original chrome region. All inputs earlier-declared
  // (including effectiveSelectedKeys host alias). Pure construction-time
  // deriveds — no $state/handlers/effects.
  const chromeState = createPlotChromeState({
    model: () => model,
    zoomConfig: () => interactionConfig.zoom,
    selectConfig: () => interactionConfig.select,
    configuredAvailableTools: () => interactionConfig.availableTools,
    interactionDiagnostics: () => interactionConfig.diagnostics,
    interactive: () => interactive,
    effectiveZoomDomains: () => effectiveZoomDomains,
    effectiveIntervals: () => effectiveIntervals,
    effectiveSelectedKeys: () => effectiveSelectedKeys,
    effectiveEmphasisKeys: () => effectiveEmphasisKeys,
    legendFocusEnabled: () => legendFocusEnabled,
    hasCanvas: () => hasCanvas,
    width: () => width,
    resolvedWidth: () => resolvedWidth,
    resolvedHeight: () => resolvedHeight,
  });
  // Host one-liners at original positions for markup consumers. Surface's
  // availableTools / pointSelectEnabled read chromeState accessors directly
  // (deferred closures). Diagnostics aliases feed the host effects below.
  const availableTools = $derived(chromeState.availableTools);
  const hasPointSelection = $derived(chromeState.hasPointSelection);
  const hasIntervalSelection = $derived(chromeState.hasIntervalSelection);
  const showToolRail = $derived(chromeState.showToolRail);
  const emptyPlot = $derived(chromeState.emptyPlot);
  const preciseIntervalAxes = $derived(chromeState.preciseIntervalAxes);
  const preciseZoomAxes = $derived(chromeState.preciseZoomAxes);
  // Public accessors — host diagnostic effects stay at their positions
  // (registration order semantic service → diagnostic effects is load-bearing).
  const areaScaleDiagnostics = $derived(chromeState.areaScaleDiagnostics);
  const legendDiagnostics = $derived(chromeState.legendDiagnostics);
  const capabilityStatus = $derived(chromeState.capabilityStatus);
  const rootStyle = $derived(chromeState.rootStyle);
  // Anchors: methods with host one-liner deriveds at original positions
  // (server-eager order preserved; later-declared inputs).
  const selectedAnchors = $derived(selectionState.computeSelectedAnchors());
  const emphasizedAnchors = $derived(selectionState.computeEmphasizedAnchors());

  const plotId = $props.id();
  // Semantic-key service at the original registration site (diagnostics effect order).
  const semanticKeys = createSemanticKeyService({
    model: () => model,
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

  $effect(() => {
    for (const diagnostic of areaScaleDiagnostics)
      deliverDiagnostic(diagnostic);
  });

  $effect(() => {
    for (const diagnostic of legendDiagnostics) deliverDiagnostic(diagnostic);
  });

  // Surface window-teardown + tool-sync effects at the original line-810 site
  // (after diagnostics, before catalog/focus/inspection registrations).
  surfaceState.registerSurfaceEffects();

  // Three separate host derived aliases at original 768–798 positions —
  // intermediate memo boundaries live here (do NOT fold into one method).
  const presentationFocusKeys = $derived(
    selectionState.computePresentationFocusKeys(),
  );
  const semanticCandidateProjections = $derived(
    selectionState.computeSemanticCandidateProjections(),
  );
  const interactionMasks = $derived(
    selectionState.computeInteractionMasks(
      presentationFocusKeys,
      semanticCandidateProjections,
    ),
  );

  // Host-side deriveds: must not live in the factory (server-eager model TDZ).
  const interactiveLegendEntries = $derived(
    legendFocusState.computeInteractiveEntries(model),
  );

  const effectiveLegendPressed: LegendEntryIdentity | null = $derived(
    legendFocusState.computeLegendPressed(model),
  );

  // Single source for "the legend clear row is shown": the root class and
  // the filter fieldset's below-clear offset must flip together (the S2
  // layout test pins their combined geometry).
  const legendClearActive = $derived(
    legendFocusEnabled && effectiveLegendPressed !== null,
  );

  // Host-side derived: must not live in the factory (server-eager model TDZ).
  const filterableLegendEntries = $derived(
    legendFilterState.computeEntries(model),
  );
  // Catalog-reconcile effect at its original position (after model effects).
  legendFilterState.registerCatalogEffects(() => filterableLegendEntries);
  // Legend-focus reconcile effects at their original position (after S2 catalog).
  legendFocusState.registerReconcileEffects();
  // Inspection disposal + scene-reconcile effects at the original coordinator
  // position (after legend-focus reconcile).
  inspectionState.registerInspectionEffects();

  /** Replace one or both continuous zoom domains without disturbing the
   *  other channel. This is the controlled linking/programmatic-zoom path. */
  export function setZoom(domains: Partial<ZoomDomains>): void {
    zoomState.setZoomDomains(domains);
  }

  // Host one-liners at original markLabel/datumLabel positions.
  const markLabel = $derived(chromeState.markLabel);
  const datumLabel = (values: Record<string, CellValue> | null) =>
    chromeState.datumLabel(values);

  // Phase 3: clientFlush/ready effect at the end of the script (late registration).
  runtime.registerLateEffects();
  const ready = $derived(runtime.ready);
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
  class:gg-with-tool-rail={showToolRail}
  class:gg-with-legend-clear={legendClearActive}
  class:gg-with-legend-filters={filterableLegendEntries.length > 0}
  class:gg-narrow-tools={isNarrowToolsWidth(resolvedWidth)}
  class:gg-with-docked-tooltip={isTooltipDocked({
    inspectionState: inspection?.state,
    widthPx: resolvedWidth,
  })}
  data-gg-ready={ready ? "true" : "false"}
  style={rootStyle}
>
  {@render children?.()}
  {#if showToolRail}
    <ToolRail
      {availableTools}
      {activeTool}
      {ready}
      {emptyPlot}
      narrow={isNarrowToolsWidth(resolvedWidth)}
      zoomDomains={effectiveZoomDomains}
      {hasPointSelection}
      {hasIntervalSelection}
      intervalTargetLabel={intervalState.currentIntervalTargetLabel}
      canSetIntervalBounds={!emptyPlot &&
        preciseIntervalAxes.length > 0 &&
        intervalState.intervalBoundsTargetAvailable}
      canSetZoomBounds={!emptyPlot && preciseZoomAxes.length > 0}
      intervalAxes={preciseIntervalAxes}
      zoomAxes={preciseZoomAxes}
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
  {#if model !== null}
    <PlotMarkStrata
      {model}
      {strata}
      {markLabel}
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
      sceneWidth={model.scene.width}
      sceneHeight={model.scene.height}
      clearLegendX={resolveClearLegendX({
        legendFocusEnabled,
        pressedScale: effectiveLegendPressed?.scale ?? null,
        legends: model.scene.legends,
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
      width={model.scene.width}
      height={model.scene.height}
      {interactive}
      {surfaceInteractive}
      {inspection}
      {inspectionPanel}
      {coordFlipped}
      {selectedAnchors}
      {emphasizedAnchors}
      {brushRect}
      {activeTool}
      {areaAwaitingSecond}
      committedInterval={intervalState.committedInterval}
    />
    {#if surfaceInteractive}
      <!-- Order (document = paint): overlay → capture → Tooltip → status chrome. -->
      <PlotCaptureSurface
        bind:element={captureSurface}
        {plotId}
        {activeTool}
        ariaLabel={ariaLabel ??
          assembled?.labs?.title ??
          sceneLabel(model.scene)}
        ariaControls={resolveCaptureAriaControls({
          inspectionState: inspection?.state,
          contentMode: interactionConfig.inspect?.contentMode,
          plotId,
        })}
        onFocus={() => {
          if (inspection === null) inspectionState.navigate(1);
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
      {#if inspection !== null}
        {@const tooltipSize = tooltipViewportSize({
          sceneWidth: model.scene.width,
          sceneHeight: model.scene.height,
          clientWidth: root?.clientWidth,
          clientHeight: root?.clientHeight,
        })}
        <Tooltip
          id={plotTooltipDomId(plotId)}
          {inspection}
          width={tooltipSize.width}
          height={tooltipSize.height}
          content={interactionConfig.inspect?.content}
          interactive={interactionConfig.inspect?.contentMode === "interactive"}
          docked={isTooltipDocked({
            inspectionState: inspection.state,
            widthPx: resolvedWidth,
          })}
          onenter={() => (tooltipHovered = true)}
          onleave={() => {
            tooltipHovered = false;
            if (inspection?.state !== "pinned")
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
      description={surfaceDescription}
      activeDatumLabel={datumLabel(inspection?.focus.row ?? null)}
      showAreaInstruction={surfaceInteractive && areaAwaitingSecond}
      showLiveRegion={shouldRenderInteractionLiveRegion({
        surfaceInteractive,
        legendFocusEnabled,
        legendFilterEnabled: legendFilterState.options !== null,
      })}
      liveText={resolveInteractionLiveText({
        announcement: announcer.text,
        model,
        inspection,
      })}
      {emptyPlot}
      {capabilityStatus}
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
