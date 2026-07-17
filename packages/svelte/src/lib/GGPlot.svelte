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
  import type {
    CandidateFacts,
    BatchInteractionMask,
    CellValue,
    RenderModel,
  } from "@ggsvelte/core";
  import { buildInteractionMasks, sceneLabel } from "@ggsvelte/core";
  import type { SceneHit, SceneHitIndex } from "@ggsvelte/core/dom";
  import { buildHitIndex } from "@ggsvelte/core/dom";

  import {
    INTERACTION_DIAGNOSTIC_CATALOG,
    normalizeInteractionConfig,
    type InspectInput,
    type InteractionDiagnostic,
    type InteractionSource,
    type InteractionTool,
    type IntervalSelection,
    type LegendFocusEvent,
    type LegendFocusInput,
    type PlotInspection,
    type PlotInspectionChange,
    type PlotInteractionEvent,
    type PlotInteractionScope,
    type PlotSelection,
    type SelectInput,
    type ZoomDomains,
    type ZoomEvent,
    type ZoomInput,
  } from "./interaction.js";
  import type { PlotInteractionController } from "./interaction-controller.svelte.js";
  import { createInspectionCoordinator } from "./inspection-resolver.js";
  import { createInteractionReducer } from "./interaction-reducer.js";
  import { provideRegistry } from "./registry.svelte.js";
  import {
    assemblePortableSpec,
    isFacetedPlotIntent,
    resolveInteractionScope,
    toLayerInput,
  } from "./plot-assemble.js";
  import { brushAtPoint, brushWithEnd } from "./plot-area-brush.js";
  import { normalizedRect, panelContainingAnchor } from "./plot-geometry.js";
  import { resolveSurfaceKeyAction } from "./plot-surface-keyboard.js";
  import {
    buildInspectionCandidateRef,
    buildQueuedInspectFrame,
    resolveQueuedInspectFrameAction,
    type QueuedPointerInspection,
  } from "./plot-surface-inspection-frame.js";
  import {
    resolveInspectionCompleteness,
    resolveInspectionMode,
    resolveSetInspectionAction,
    resolveToggleInspectionPinAction,
    shouldAnnounceUnpin,
    shouldClearInspectionAnnouncement,
    shouldCommitInspection,
    shouldFocusPinnedInteractiveTooltip,
  } from "./plot-surface-inspection-apply.js";
  import {
    planInspectionDismiss,
    planSceneInspectReconcile,
    resolveInspectionEmitAction,
    resolveSurfaceBlurAction,
    shouldClosePinnedOnOutsidePointer,
  } from "./plot-surface-inspection-teardown.js";
  import { type FinishBrushAction } from "./plot-brush-finish.js";
  import {
    resolveCaptureClickAction,
    advanceTouchInspectMoved,
    isAreaAwaitingSecond,
    isAreaBrushing,
    resolveLostPointerCaptureAction,
    resolvePointerDownAction,
    resolvePointerMoveAction,
    resolvePointerUpAction,
    shouldClearInspectionOnPointerLeave,
    POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
    TOUCH_INSPECT_CLICK_SUPPRESS_MS,
  } from "./plot-surface-pointer.js";
  import { shouldRenderInteractionLiveRegion } from "./plot-legend-surface.js";
  import {
    BRUSH_SECOND_CORNER_ANNOUNCEMENT,
    datumLabel as datumLabelFor,
    inspectionLiveText as inspectionLiveTextFor,
    markLabel as markLabelFor,
    resolveInteractionLiveText,
    selectionAnnouncement,
  } from "./plot-labels.js";
  import {
    isContainerWidthProp,
    isNarrowToolsWidth,
    isTooltipDocked,
    plotRootInlineStyle,
    plotTooltipDomId,
    resolveCaptureAriaControls,
    resolveClearLegendX,
    tooltipViewportSize,
  } from "./plot-layout.js";
  import {
    bestDirectionalIndex,
    buildTraversalHits,
    cycleCoincidentIndex,
    hitFromCandidate,
    matchCandidateFromHit,
    nextTraversalIndex,
    planCycleCoincident,
    planDirectionalNavigate,
    plotPointFromClient,
  } from "./plot-pointer.js";
  import {
    bandChannelsForZoom,
    capabilityStatusText,
    filterAvailableTools,
    isEmptyPlotScene,
    legendFocusDiscreteOnlyDiagnostics,
    resolveChooseToolAction,
    resolveEffectiveTool,
    shouldShowToolRail,
    zoomScaleDiagnosticsFromChannels,
    zoomSupportsChannel,
  } from "./plot-capability.js";
  import {
    buildIntervalSelectionFromScene,
    intervalQuerySceneFromModel,
    type IntervalQueryScene,
  } from "./plot-interval-query.js";
  import BoundsEditor from "./BoundsEditor.svelte";
  import {
    anchorsFromCandidateKeys,
    buildPointSelectionEvent,
    collectCandidates,
    iterateCandidates,
    mergePresentationFocusKeys,
    nextPointSelectionKeys,
    sameOrderedPropertyKeys,
  } from "./plot-selection.js";
  import {
    createSourceIdentityTracker,
    dataIdentityEpochToken,
  } from "./plot-semantic-keys.js";
  import {
    createPlotAnnouncer,
    createSemanticKeyService,
  } from "./plot-shared-services.svelte.js";
  import { createPlotRuntime } from "./plot-runtime.svelte.js";
  import { themeTokensToCss } from "./plot-theme-css.js";
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
  // Announcer is declared later; the sink is handler-only (never construction).
  const announceSink = (message: string): void => {
    announcer.announce(message);
  };

  // ------------------------------------------------------------ zoom respec (S4)
  // Factory sits at the original zoom-respec region (before announcer /
  // runtime). Construction-time deriveds read interaction/scope/zoomConfig/
  // assembled only — never model/coordFlipped/announce (Svelte 5.29 server
  // evaluates $derived eagerly at construction).
  // controllerRevision has non-zoom consumers (selection/intervals) and stays.
  const controllerRevision = $derived(interaction?.revision ?? 0);
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

  let reducerRevision = $state(0);
  let queuedPointerToken: {
    readonly epoch: number;
    readonly revision: number;
  } | null = null;
  let queuedPointerInspection: QueuedPointerInspection | null = null;
  let pendingPinnedPointer: QueuedPointerInspection | null = null;
  let queuedAreaSource: InteractionSource = "pointer";
  const reducer = createInteractionReducer({
    onChange: () => {
      reducerRevision += 1;
    },
    scheduleFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (handle) => cancelAnimationFrame(handle as number),
    onPointerFrame: (action) => {
      if (action.type === "move-area") {
        applyAreaMove(action.point, queuedAreaSource);
      } else {
        // Snapshot then clear queues before pure routing (matches prior host).
        const pending = queuedPointerInspection;
        const token = queuedPointerToken;
        queuedPointerInspection = null;
        queuedPointerToken = null;
        // Short-circuit tokenAccepted when no pending so accepts() is not
        // called for empty frames (Codex plan review).
        const frameAction = resolveQueuedInspectFrameAction({
          hasPending: pending !== null,
          tokenAccepted:
            pending === null || token === null || reducer.accepts(token),
          currentState: inspection?.state ?? "none",
          candidateEpochMismatch:
            action.candidate !== null &&
            action.candidate.epoch !== model?.runId,
        });
        switch (frameAction.type) {
          case "none":
          case "drop":
            return;
          case "stash-pending":
            if (pending === null) return;
            pendingPinnedPointer = pending;
            return;
          case "apply-pending":
            if (pending === null) return;
            setInspection(
              pending.hit,
              pending.source,
              "transient",
              pending.concreteMode,
              pending.candidate,
            );
            break;
        }
      }
    },
  });
  const activeTool = $derived.by(() => {
    void reducerRevision;
    return reducer.state.tool;
  });
  const surfaceDescription = $derived.by(() => {
    if (activeTool === "select-area")
      return "Press Enter or Space to set the first selection corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the selection. Press Escape to cancel.";
    if (activeTool === "zoom-area")
      return "Press Enter or Space to set the first zoom corner. Use Arrow keys to move the opposite corner; hold Shift for larger steps. Press Enter or Space to complete the zoom. Press Escape to cancel.";
    if (activeTool === "point")
      return "Use Arrow keys to inspect data. Press Enter or Space to toggle the focused point selection. Press Escape to dismiss.";
    return interactionConfig.inspect?.pin === true
      ? "Use Arrow keys to inspect data. Press Enter or Space to pin. Press Escape to dismiss."
      : "Use Arrow keys to inspect data. Press Escape to dismiss.";
  });
  let inspection = $state<PlotInspectionChange<
    Record<string, CellValue>,
    PropertyKey
  > | null>(null);
  let inspectionSeed: CandidateFacts | null = null;
  const inspectionPanel = $derived.by(() => {
    if (inspection === null || model === null) return null;
    return panelContainingAnchor(model.scene.panels, inspection.focus.anchor);
  });
  const coordFlipped = $derived(assembled?.coord?.type === "flip");
  let tooltipHovered = $state(false);
  let captureSurface = $state<HTMLDivElement | null>(null);
  let touchInspectStart: { x: number; y: number } | null = null;
  let touchInspectMoved = false;
  let suppressClickUntil = 0;
  let brushRect = $state<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  const brushing = $derived.by(() => {
    void reducerRevision;
    return isAreaBrushing(reducer.state.area.kind);
  });
  const areaAwaitingSecond = $derived.by(() => {
    void reducerRevision;
    return isAreaAwaitingSecond(reducer.state.area.kind);
  });
  let lastInspectionFingerprint = "";
  let activeTraversalIndex = $state(-1);
  let localSelectedKeys = $state<PropertyKey[]>([]);
  const effectiveSelectedKeys: readonly PropertyKey[] = $derived.by(() => {
    void controllerRevision;
    return interaction?.selected(resolvedInteractionScope) ?? localSelectedKeys;
  });
  // Shared enablement predicates (avoid re-typing the same config gates).
  const inspectEnabled = $derived(interactionConfig.inspect !== null);
  const pinEnabled = $derived(interactionConfig.inspect?.pin === true);
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
    emitSelection,
    announce: announceSink,
  });
  // Host one-liners at original positions for later consumers.
  const effectiveIntervals = $derived(intervalState.effectiveIntervals);
  const effectiveIntervalKeys = $derived(intervalState.effectiveIntervalKeys);
  const committedInterval = $derived(intervalState.committedInterval);
  const zoomHasSupportedChannel = $derived.by(() => {
    if (interactionConfig.zoom === null || model === null) return true;
    return zoomSupportsChannel(interactionConfig.zoom.mode, model.scales);
  });
  const availableTools = $derived(
    filterAvailableTools(
      interactionConfig.availableTools,
      zoomHasSupportedChannel,
    ),
  );
  const canPublishPointSelection = $derived(
    interactionConfig.select?.type === "point",
  );
  // Shared by tool-rail visibility and ToolRail recovery props (avoid dual calc).
  const hasPointSelection = $derived(
    canPublishPointSelection && effectiveSelectedKeys.length > 0,
  );
  // R3: interval presence covers dormant panel intervals, not just the
  // committed one (effectiveIntervals), so recovery controls stay reachable.
  const hasIntervalSelection = $derived(effectiveIntervals.length > 0);
  const hasZoomDomains = $derived(effectiveZoomDomains !== null);
  const showToolRail = $derived(
    shouldShowToolRail({
      interactive,
      availableToolCount: availableTools.length,
      canPublishPointSelection,
      selectedKeyCount: effectiveSelectedKeys.length,
      hasIntervalSelection,
      hasZoomDomains,
    }),
  );
  const emptyPlot = $derived(
    model !== null && isEmptyPlotScene(model.scene.batches),
  );
  const preciseIntervalAxes = $derived.by((): readonly ("x" | "y")[] => {
    const selectOptions = interactionConfig.select;
    if (selectOptions === null || selectOptions.type !== "interval") return [];
    return (["x", "y"] as const).filter(
      (axis) => selectOptions.mode === "xy" || selectOptions.mode === axis,
    );
  });
  const preciseZoomAxes = $derived.by((): readonly ("x" | "y")[] => {
    if (interactionConfig.zoom === null || model === null) return [];
    return (["x", "y"] as const).filter(
      (axis) =>
        (interactionConfig.zoom?.mode === "xy" ||
          interactionConfig.zoom?.mode === axis) &&
        model.scales[axis].type !== "band",
    );
  });
  const areaScaleDiagnostics = $derived.by(() => {
    if (model === null || interactionConfig.zoom === null)
      return [] as InteractionDiagnostic[];
    return zoomScaleDiagnosticsFromChannels(
      bandChannelsForZoom(interactionConfig.zoom.mode, model.scales),
      INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INTERVAL_SCALE_UNSUPPORTED,
    );
  });
  const legendDiagnostics = $derived.by(() => {
    if (model === null) return [] as InteractionDiagnostic[];
    return legendFocusDiscreteOnlyDiagnostics(
      legendFocusEnabled,
      model.scene.legends,
    );
  });
  const capabilityStatus = $derived.by(() => {
    const unavailable = interactionConfig.diagnostics.find(
      (diagnostic) =>
        diagnostic.code === "INTERACTION_INTERVAL_FACET_UNSUPPORTED",
    );
    return capabilityStatusText({
      ...(unavailable !== undefined && {
        facetUnavailableMessage: unavailable.message,
      }),
      areaDiagnostics: areaScaleDiagnostics,
      zoomSupported: zoomHasSupportedChannel,
      interactive,
      emptyPlot,
      candidateCount: model === null ? null : model.candidates.size,
    });
  });
  const themeStyle = $derived.by(() =>
    model === null ? "" : themeTokensToCss(model.scene.theme),
  );
  const rootStyle = $derived(
    plotRootInlineStyle({
      needsSizedBox:
        hasCanvas ||
        interactive ||
        effectiveEmphasisKeys.length > 0 ||
        effectiveSelectedKeys.length > 0,
      containerWidth: isContainerWidthProp(width),
      sceneWidth: model?.scene.width ?? resolvedWidth,
      sceneHeight: model?.scene.height ?? resolvedHeight,
      themeStyle,
    }),
  );
  function anchorsForKeys(keys: readonly PropertyKey[]): {
    x: number;
    y: number;
  }[] {
    // Empty filter short-circuits before walking (keysFor can be expensive).
    if (model === null || keys.length === 0) return [];
    return anchorsFromCandidateKeys(
      collectCandidates(model.candidates, (candidate) => ({
        x: candidate.x,
        y: candidate.y,
        keys: candidateSemanticKeys(candidate),
      })),
      keys,
    );
  }
  const selectedAnchors = $derived(
    anchorsForKeys([
      ...new Set([...effectiveSelectedKeys, ...effectiveIntervalKeys]),
    ]),
  );
  const emphasizedAnchors = $derived(anchorsForKeys(effectiveEmphasisKeys));

  function commitPointSelection(
    keys: readonly PropertyKey[],
    source: InteractionSource,
  ): void {
    let committed: readonly PropertyKey[];
    if (interaction === undefined) {
      const next = [...new Set(keys)];
      if (sameOrderedPropertyKeys(next, localSelectedKeys)) return;
      localSelectedKeys = next;
      committed = localSelectedKeys;
    } else {
      const transition = interaction.setSelection(
        keys as readonly PublicKey[],
        {
          scope: resolvedInteractionScope,
          source,
        },
      );
      if (transition === null) return;
      committed =
        transition.snapshot.selections.find(
          (selection) => selection.scope === resolvedInteractionScope.keys,
        )?.keys ?? [];
    }
    emitSelection(buildPointSelectionEvent(committed, source));
  }

  function clearPointSelection(source: InteractionSource): void {
    if (effectiveSelectedKeys.length === 0) return;
    commitPointSelection([], source);
  }

  function emitSelection(event: PlotSelection): void {
    const message = selectionAnnouncement(event);
    if (message !== null) announcer.announce(message);
    onselect?.(event as unknown as PlotSelection<PublicKey>);
    oninteraction?.(event as unknown as PlotInteractionEvent<Row, PublicKey>);
  }

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

  $effect(() => {
    if (!surfaceInteractive) return;
    const onOutsidePointer = (event: PointerEvent) => {
      if (
        !shouldClosePinnedOnOutsidePointer({
          inspectionState: inspection?.state,
          targetInsideRoot: root?.contains(event.target as Node) === true,
        })
      )
        return;
      closeInspection("pointer", false);
    };
    const cancelDraft = () => {
      brushRect = null;
      queuedPointerInspection = null;
      touchInspectStart = null;
      reducer.cancelScheduledPointer();
      reducer.dispatch({ type: "cancel-area" });
    };
    window.addEventListener("pointerdown", onOutsidePointer);
    window.addEventListener("blur", cancelDraft);
    return () => {
      window.removeEventListener("pointerdown", onOutsidePointer);
      window.removeEventListener("blur", cancelDraft);
    };
  });

  $effect(() => {
    const next = resolveEffectiveTool(
      tool ?? interactionConfig.initialTool,
      availableTools,
    );
    reducer.dispatch({ type: "set-tool", tool: next });
  });

  function chooseTool(next: InteractionTool): void {
    // Decision table is pure (plot-capability); this switch owns side effects.
    const action = resolveChooseToolAction({
      next,
      available: availableTools,
      isControlled: tool !== undefined,
    });
    switch (action.type) {
      case "ignore":
        return;
      case "request":
        ontoolchange?.(next);
        return;
      case "apply":
        reducer.dispatch({ type: "set-tool", tool: next });
        brushRect = null;
        queuedPointerInspection = null;
        reducer.cancelScheduledPointer();
        ontoolchange?.(next);
        break;
    }
  }

  function plotPoint(event: PointerEvent | MouseEvent): {
    x: number;
    y: number;
  } {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const scene = model?.scene;
    if (scene === undefined) return { x: 0, y: 0 };
    return plotPointFromClient(event.clientX, event.clientY, rect, scene);
  }

  function panelId(index: number): string | null {
    const panel = model?.scene.panels[index];
    if (panel === undefined) return null;
    return panel.id;
  }

  function panelAtPoint(point: Readonly<{ x: number; y: number }>) {
    const panels = model?.scene.panels ?? [];
    return (
      panels.find(
        (panel) =>
          point.x >= panel.x &&
          point.x <= panel.x + panel.width &&
          point.y >= panel.y &&
          point.y <= panel.y + panel.height,
      ) ?? (panels.length === 1 ? panels[0]! : null)
    );
  }

  const presentationFocusKeys: readonly PropertyKey[] = $derived(
    mergePresentationFocusKeys(
      effectiveEmphasisKeys,
      inspection === null
        ? null
        : {
            sourceKeys: inspection.focus.sourceKeys,
            key: inspection.focus.key,
          },
    ),
  );

  const semanticCandidateProjections = $derived.by(() => {
    if (model === null) return [];
    return collectCandidates(model.candidates, (candidate) => ({
      batchIndex: candidate.batchIndex,
      primitiveIndex: candidate.primitiveIndex,
      keys: candidateSemanticKeys(candidate),
    }));
  });

  const interactionMasks: readonly (BatchInteractionMask | null)[] =
    $derived.by(() => {
      if (model === null || presentationFocusKeys.length === 0) return [];
      return buildInteractionMasks(
        model.scene.batches,
        presentationFocusKeys,
        semanticCandidateProjections,
      );
    });

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

  const inspectionCoordinator = createInspectionCoordinator<
    Record<string, CellValue>,
    PropertyKey
  >((_row, index) => semanticKeys.keyAt(index));

  $effect(() => () => inspectionCoordinator.invalidate());

  function candidateFromHit(hit: SceneHit): CandidateFacts | null {
    if (model === null) return null;
    return matchCandidateFromHit(iterateCandidates(model.candidates), hit);
  }

  function resolveInspection(
    hit: SceneHit,
    source: InteractionSource,
    state: "transient" | "pinned" = "transient",
    concreteMode?: "exact" | "x" | "y" | "xy",
    candidate?: CandidateFacts,
  ) {
    if (model === null)
      throw new Error("Cannot resolve inspection without a render model");
    const seed =
      candidate ??
      candidateFromHit(hit) ??
      model.candidates.nearest(hit.x, hit.y, { mode: "exact", maxDistance: 0 });
    if (seed === null)
      throw new Error("Inspection hit was not present in the candidate store");
    const requested = interactionConfig.inspect?.mode ?? "auto";
    const mode = resolveInspectionMode({
      concreteMode,
      requested,
      seedAutoMode: seed.autoMode,
    });
    return inspectionCoordinator.resolve({
      model,
      seed,
      mode,
      state,
      source,
      identityEpoch: dataIdentityEpoch,
      layoutEpoch: model.runId,
      completeness: resolveInspectionCompleteness({
        state,
        hasCustomContent: interactionConfig.inspect?.content !== undefined,
        hasInspectCallback: oninspect !== undefined,
        hasInteractionCallback: oninteraction !== undefined,
      }),
    });
  }

  const traversalHits: SceneHit[] = $derived.by(() => {
    if (!surfaceInteractive || model === null) return [];
    return buildTraversalHits(model.candidates);
  });
  let reconciledRun = -1;
  $effect(() => {
    const currentModel = model;
    const plan = planSceneInspectReconcile({
      inspectionEnabled: inspectEnabled,
      // Thunk: do not read `inspection` on the same-run skip path so hover
      // updates are not effect dependencies of scene-run reconcile.
      getInspectionState: () =>
        inspection === null ? "none" : inspection.state,
      modelRunId: currentModel?.runId ?? null,
      reconciledRun,
    });
    switch (plan.type) {
      case "noop":
      case "skip":
        return;
      case "clear-disabled":
        inspectionCoordinator.invalidate();
        inspection = null;
        inspectionSeed = null;
        reducer.dispatch({
          type: "inspect",
          candidate: null,
          source: "programmatic",
        });
        return;
      case "invalidate-clear-transient":
      case "invalidate-idle":
      case "invalidate-reconcile-pinned": {
        // currentModel is non-null for invalidate-* (plan requires run advance).
        const runId = currentModel!.runId;
        reducer.dispatch({ type: "invalidate", reason: "scene" });
        queuedPointerInspection = null;
        pendingPinnedPointer = null;
        queuedPointerToken = null;
        reducer.cancelScheduledPointer();
        reconciledRun = runId;
        if (plan.type === "invalidate-clear-transient") {
          inspectionCoordinator.release("transient");
          inspection = null;
          inspectionSeed = null;
          reducer.dispatch({
            type: "inspect",
            candidate: null,
            source: "programmatic",
          });
          return;
        }
        if (plan.type === "invalidate-idle") return;
        const reconciled = inspectionCoordinator.reconcilePinned({
          model: currentModel!,
          identityEpoch: dataIdentityEpoch,
          layoutEpoch: runId,
          source: "programmatic",
          completeness: "complete",
        });
        if (reconciled === null) {
          reducer.dispatch({ type: "escape", source: "programmatic" });
          reducer.dispatch({ type: "set-active", candidate: null });
          emitInspection({
            type: "inspect",
            phase: "clear",
            source: "programmatic",
          });
          inspection = null;
          inspectionSeed = null;
        } else {
          inspection = reconciled.snapshot;
          inspectionSeed = reconciled.seed;
          if (reconciled.semanticChanged)
            emitInspection(reconciled.snapshot, reconciled.semanticFingerprint);
        }
        break;
      }
    }
  });

  function emitInspection(
    next: PlotInspection<Record<string, CellValue>>,
    semanticFingerprint?: string,
  ): void {
    // Pure table owns clear vs semantic fingerprint + skip/emit gate.
    // Host owns last-token mutation and callbacks only.
    const emit = resolveInspectionEmitAction({
      phase: next.phase,
      source: next.source,
      semanticFingerprint,
      lastFingerprint: lastInspectionFingerprint,
    });
    if (emit.type === "skip") return;
    if (emit.updateFingerprint !== null)
      lastInspectionFingerprint = emit.updateFingerprint;
    oninspect?.(next as unknown as PlotInspection<Row, PublicKey>);
    oninteraction?.(next as unknown as PlotInteractionEvent<Row, PublicKey>);
  }

  function setInspection(
    hit: SceneHit | null,
    source: InteractionSource,
    state: "transient" | "pinned" = "transient",
    concreteMode?: "exact" | "x" | "y" | "xy",
    candidate?: CandidateFacts,
  ): void {
    // Announcement clear runs before priority gates (including ignored
    // keyboard/touch requests while pinned).
    if (
      shouldClearInspectionAnnouncement({
        hasHit: hit !== null,
        source,
      })
    )
      announcer.clear();
    const action = resolveSetInspectionAction({
      hasHit: hit !== null,
      requestedState: state,
      currentState: inspection?.state ?? "none",
      tooltipHovered,
    });
    switch (action.type) {
      case "ignore":
        return;
      case "clear": {
        // Preserve both dispatches (before emit/release and after) — do not
        // dedupe; may be load-bearing for reducer revision counting.
        reducer.dispatch({ type: "inspect", candidate: null, source });
        if (action.emitClear)
          emitInspection({ type: "inspect", phase: "clear", source });
        inspection = null;
        inspectionSeed = null;
        inspectionCoordinator.release("transient");
        reducer.dispatch({ type: "inspect", candidate: null, source });
        return;
      }
      case "apply": {
        // hit is non-null when action is apply (pure gate).
        const resolved = resolveInspection(
          hit!,
          source,
          state,
          concreteMode,
          candidate,
        );
        // Null resolve re-enters clear gates via setInspection(null, source).
        if (resolved === null) {
          setInspection(null, source);
          return;
        }
        const next = resolved.snapshot;
        const candidateRef = buildInspectionCandidateRef({
          epoch: model?.runId ?? 0,
          candidateId: candidate?.id,
          fallbackId: () => traversalHits.indexOf(hit!),
          panelId: next.panelId,
          x: hit!.x,
          y: hit!.y,
        });
        reducer.dispatch({ type: "inspect", candidate: candidateRef, source });
        if (state === "pinned")
          reducer.dispatch({ type: "toggle-pin", source });
        if (
          !shouldCommitInspection({
            requestedState: state,
            reducerKind: reducer.state.inspection.kind,
          })
        )
          return;
        inspection = next;
        inspectionSeed = resolved.seed;
        if (resolved.semanticChanged)
          emitInspection(next, resolved.semanticFingerprint);
      }
    }
  }

  function toggleInspectionPin(source: InteractionSource): void {
    const pinAction = resolveToggleInspectionPinAction({
      hasInspection: inspection !== null,
      hasSeed: inspectionSeed !== null,
      currentState: inspection?.state ?? "transient",
      pending: pendingPinnedPointer,
    });
    if (pinAction.type === "ignore") return;
    // toggle-pin always runs before restore/flip side effects; if flip
    // resolve returns null the reducer stays toggled (no rollback).
    reducer.dispatch({ type: "toggle-pin", source });
    switch (pinAction.type) {
      case "restore-pending": {
        // Pure gate carries pending payload — no host non-null assert.
        pendingPinnedPointer = null;
        inspectionCoordinator.release("pinned");
        inspection = null;
        inspectionSeed = null;
        setInspection(
          pinAction.pending.hit,
          pinAction.pending.source,
          "transient",
          pinAction.pending.concreteMode,
          pinAction.pending.candidate,
        );
        return;
      }
      case "flip": {
        // inspection + seed non-null after non-ignore (pure gate).
        const state = pinAction.state;
        const resolved = resolveInspection(
          hitFromCandidate(inspectionSeed!),
          source,
          state,
          inspection!.mode,
          inspectionSeed!,
        );
        if (resolved === null) return;
        inspection = resolved.snapshot;
        inspectionSeed = resolved.seed;
        if (state === "transient")
          reducer.dispatch({
            type: "inspect",
            candidate: {
              epoch: model?.runId ?? 0,
              id: inspectionSeed.id,
              panelId: resolved.snapshot.panelId,
              x: inspectionSeed.x,
              y: inspectionSeed.y,
            },
            source,
          });
        if (state === "transient") inspectionCoordinator.release("pinned");
        if (shouldAnnounceUnpin({ state, source }))
          announcer.announce(
            `${inspectionLiveText(resolved.snapshot)}, unpinned`,
          );
        if (resolved.semanticChanged)
          emitInspection(resolved.snapshot, resolved.semanticFingerprint);
        if (
          shouldFocusPinnedInteractiveTooltip({
            state,
            contentMode: interactionConfig.inspect?.contentMode,
          })
        )
          queueMicrotask(() =>
            root
              ?.querySelector<HTMLElement>(
                `#${CSS.escape(plotTooltipDomId(plotId))}`,
              )
              ?.focus(),
          );
      }
    }
  }

  /**
   * Shared dismiss path for Escape and closeInspection.
   * Pure plan owns escape-vs-close differences; host owns dispatch/emit/DOM.
   */
  function dismissInspection(
    kind: "escape" | "close",
    source: InteractionSource,
    opts: { restoreFocus?: boolean; returnToInspect?: boolean } = {},
  ): void {
    const plan = planInspectionDismiss({
      kind,
      hasInspection: inspection !== null,
      ...(opts.restoreFocus !== undefined && {
        restoreFocus: opts.restoreFocus,
      }),
      ...(opts.returnToInspect !== undefined && {
        returnToInspect: opts.returnToInspect,
      }),
    });
    reducer.dispatch({ type: "escape", source });
    if (plan.emitClear)
      emitInspection({ type: "inspect", phase: "clear", source });
    inspection = null;
    inspectionSeed = null;
    if (plan.clearTooltipHovered) tooltipHovered = false;
    if (plan.clearPendingPinned) pendingPinnedPointer = null;
    if (plan.coordinator === "invalidate") inspectionCoordinator.invalidate();
    else inspectionCoordinator.release("pinned");
    if (plan.clearBrush) brushRect = null;
    if (plan.restoreFocus) queueMicrotask(() => captureSurface?.focus());
    if (plan.returnToInspect) chooseTool("inspect");
  }

  function closeInspection(
    source: InteractionSource,
    restoreFocus = true,
  ): void {
    dismissInspection("close", source, { restoreFocus });
  }

  function onPointerMove(event: PointerEvent): void {
    const p = plotPoint(event);
    // Sticky threshold is pure; host only advances on touch + start set.
    if (event.pointerType === "touch" && touchInspectStart !== null) {
      touchInspectMoved = advanceTouchInspectMoved(
        touchInspectMoved,
        touchInspectStart,
        p,
      );
    }
    // Decision table is pure (plot-surface-pointer); this switch owns queues.
    const action = resolvePointerMoveAction({
      pointerType: event.pointerType,
      activeTool,
      touchInspectMoved,
      hasTouchInspectStart: touchInspectStart !== null,
      brushing,
      hasBrushDraft: brushRect !== null,
      inspect: interactionConfig.inspect,
    });
    switch (action.type) {
      case "touch-inspect-drag-cancel":
        queuedPointerInspection = null;
        reducer.cancelScheduledPointer();
        return;
      case "queue-area-move":
        queuedAreaSource = action.source;
        reducer.queuePointer({ type: "move-area", point: p });
        return;
      case "queue-inspect": {
        // mode/maxDistance from pure snapshot — no inspect config re-gate.
        const match =
          model?.candidates.nearest(p.x, p.y, {
            mode: action.mode,
            maxDistance: action.maxDistance,
          }) ?? null;
        // One null branch for hit + reducer candidate (lazy hitTest / panelId).
        const frame = buildQueuedInspectFrame({
          match,
          source: action.source,
          epoch: model?.runId ?? 0,
          fallbackHit: () => hitIndex?.hitTest(p.x, p.y) ?? null,
          panelIdForIndex: (index) => panelId(index),
        });
        queuedPointerInspection = frame.queued;
        queuedPointerToken = reducer.frameToken();
        reducer.queuePointer({
          type: "inspect",
          candidate: frame.candidate,
          source: action.source,
        });
        break;
      }
      case "none":
        break;
    }
  }

  function applyAreaMove(
    point: Readonly<{ x: number; y: number }>,
    source: InteractionSource,
  ): void {
    if (!brushing || brushRect === null) return;
    brushRect = brushWithEnd(brushRect, point);
    if (activeTool === "select-area")
      emitSelection(
        selectionEvent("change", normalizedRect(brushRect), source),
      );
  }

  /** Map the live render model into the pure interval query scene adapter. */
  function intervalQueryScene(): IntervalQueryScene | null {
    if (model === null) return null;
    return intervalQuerySceneFromModel(model, coordFlipped);
  }

  /**
   * Shared select/zoom/end/keep-second-corner effects after pure finish-brush
   * routing (pointer finish-brush and keyboard complete-area).
   * Pointer-only: callers must cancel scheduled pointer before this when needed.
   */
  function applyFinishBrush(
    finish: FinishBrushAction,
    source: InteractionSource,
  ): void {
    switch (finish.type) {
      case "keep-second-corner":
        brushRect = finish.corners;
        announcer.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        break;
      case "select-end": {
        brushRect = null;
        const eventValue = selectionEvent("end", finish.rect, source);
        // Writes (committedInterval + conditional record) then host emit —
        // order unchanged from the pre-extraction select-end branch.
        intervalState.applyBrushSelectEnd(eventValue, source);
        emitSelection(eventValue);
        reducer.dispatch({ type: "cancel-area" });
        break;
      }
      case "zoom-end":
        brushRect = null;
        zoomState.applyBrushZoom(finish.rect, source);
        reducer.dispatch({ type: "cancel-area" });
        break;
      case "end-area":
        // Commit with non-area tool (e.g. tool changed mid-drag): clear only.
        brushRect = null;
        reducer.dispatch({ type: "cancel-area" });
        break;
    }
  }

  function onPointerLeave(): void {
    // Evaluate leave clear **inside** the microtask so brushing/tooltip
    // reflect post-flush state (not leave-time snapshots).
    queueMicrotask(() => {
      if (
        !shouldClearInspectionOnPointerLeave({
          brushing,
          tooltipHovered,
        })
      )
        return;
      queuedPointerInspection = null;
      pendingPinnedPointer = null;
      reducer.cancelScheduledPointer();
      setInspection(null, "pointer");
    });
  }

  function onPointerDown(event: PointerEvent): void {
    // Always cancel queued inspection before pure routing (host cleanup).
    queuedPointerInspection = null;
    reducer.cancelScheduledPointer();
    // point always computed (pure begin-area needs it; touch/none ignore).
    const p = plotPoint(event);
    const action = resolvePointerDownAction({
      pointerType: event.pointerType,
      button: event.button,
      activeTool,
      areaAwaitingSecond,
      brushCorners: brushRect,
      point: p,
    });
    switch (action.type) {
      case "touch-inspect-start":
        touchInspectStart = p;
        touchInspectMoved = false;
        break;
      case "none":
        break;
      case "begin-area": {
        // R3: the brush is panel-scoped — extending stays on the origin
        // panel from the reducer; a fresh brush anchors to the hit panel.
        const area = reducer.state.area;
        const extending = areaAwaitingSecond && brushRect !== null;
        const originPanel = extending
          ? area.kind === "idle"
            ? null
            : (model?.scene.panels.find((panel) => panel.id === area.panelId) ??
              null)
          : panelAtPoint(p);
        if (originPanel === null) break;
        // Pure table owns fresh vs extend corner policy.
        brushRect = action.corners;
        setInspection(null, action.source);
        reducer.dispatch({
          type: "begin-area",
          point: p,
          panelId: originPanel.id,
        });
        if (action.emitSelectStart) {
          const startEvent = selectionEvent(
            "start",
            normalizedRect(action.corners),
            action.source,
          );
          emitSelection(startEvent);
        }
        try {
          (event.currentTarget as HTMLElement).setPointerCapture(
            event.pointerId,
          );
        } catch {
          // Synthetic events may not register a browser pointer id. The
          // reducer still owns cancellation; real pointer streams retain
          // capture.
        }
        break;
      }
    }
  }

  function selectionEvent(
    phase: IntervalSelection["phase"],
    rect: ReturnType<typeof normalizedRect>,
    source: InteractionSource,
  ): IntervalSelection {
    const originPanelId =
      reducer.state.area.kind === "idle"
        ? committedInterval?.panelId
        : reducer.state.area.panelId;
    return buildIntervalSelectionFromScene({
      phase,
      mode: interactionConfig.select?.mode ?? "xy",
      source,
      pixels: rect,
      scene: intervalQueryScene(),
      ...(originPanelId !== undefined && { panelId: originPanelId }),
      keyForRow: (rowIndex) =>
        semanticKey(model?.row(rowIndex) ?? null, rowIndex),
    });
  }

  function onPointerUp(event: PointerEvent): void {
    // endPoint always computed (pure finish-brush needs it; touch paths ignore).
    const endPoint = plotPoint(event);
    const action = resolvePointerUpAction({
      pointerType: event.pointerType,
      activeTool,
      inspect: interactionConfig.inspect,
      hasTouchInspectStart: touchInspectStart !== null,
      touchInspectMoved,
      brushing,
      brushCorners: brushRect,
      endPoint,
    });
    switch (action.type) {
      case "touch-inspect-drag-ignore":
        // Always clear touch-inspect start state (host cleanup).
        touchInspectStart = null;
        touchInspectMoved = false;
        break;
      case "touch-inspect-tap": {
        touchInspectStart = null;
        touchInspectMoved = false;
        // mode/maxDistance/state from pure inspect snapshot — no re-gate.
        const match = model?.candidates.nearest(endPoint.x, endPoint.y, {
          mode: action.mode,
          maxDistance: action.maxDistance,
        });
        if (match !== null && match !== undefined) {
          setInspection(
            hitFromCandidate(match),
            "touch",
            action.state,
            match.mode,
            match,
          );
          suppressClickUntil =
            performance.now() + TOUCH_INSPECT_CLICK_SUPPRESS_MS;
        }
        break;
      }
      case "none":
        break;
      case "finish-brush": {
        // Pure table owns evaluate + select/zoom/end; host cancels then applies.
        reducer.cancelScheduledPointer();
        applyFinishBrush(action.finish, action.source);
        break;
      }
    }
  }

  /** Replace one or both continuous zoom domains without disturbing the
   *  other channel. This is the controlled linking/programmatic-zoom path. */
  export function setZoom(domains: Partial<ZoomDomains>): void {
    zoomState.setZoomDomains(domains);
  }

  // Stable SceneView callback identity when model is unchanged.
  const markLabel = $derived.by(
    () => (row: number) => markLabelFor(model, row),
  );
  const datumLabel = (values: Record<string, CellValue> | null) =>
    datumLabelFor(model, values);
  const inspectionLiveText = (
    value: PlotInspectionChange<Record<string, CellValue>, PropertyKey>,
  ) => inspectionLiveTextFor(model, value);

  function applyTraversalIndex(index: number): void {
    activeTraversalIndex = index;
    setInspection(traversalHits[index]!, "keyboard");
  }

  function navigate(delta: number): void {
    if (traversalHits.length === 0) return;
    applyTraversalIndex(
      nextTraversalIndex(activeTraversalIndex, delta, traversalHits.length),
    );
  }

  function navigateDirection(dx: number, dy: number): void {
    const plan = planDirectionalNavigate({
      hitCount: traversalHits.length,
      hasInspection: inspection !== null,
      currentIndex: activeTraversalIndex,
      bestIndex: () =>
        bestDirectionalIndex(inspection!.focus.anchor, traversalHits, dx, dy),
    });
    if (plan.type === "set-index") applyTraversalIndex(plan.index);
  }

  function cycleCoincident(delta: number): void {
    const plan = planCycleCoincident({
      hasInspection: inspection !== null,
      hitCount: traversalHits.length,
      currentIndex: activeTraversalIndex,
      nextIndex: () =>
        cycleCoincidentIndex(
          inspection!.focus.anchor,
          traversalHits,
          activeTraversalIndex,
          delta,
        ),
    });
    if (plan.type === "set-index") applyTraversalIndex(plan.index);
  }

  function onSurfaceBlur(event: FocusEvent): void {
    const blurAction = resolveSurfaceBlurAction({
      relatedTargetInsideRoot:
        root?.contains(event.relatedTarget as Node | null) === true,
      inspectionState: inspection?.state ?? "none",
    });
    if (blurAction.type === "ignore") return;
    // Shared for keep-pinned and clear-inspection (ordering is load-bearing).
    activeTraversalIndex = -1;
    reducer.dispatch({ type: "set-active", candidate: null });
    if (blurAction.type === "blur-clear-inspection")
      setInspection(null, "keyboard");
  }

  function togglePointKeys(
    keys: readonly PropertyKey[],
    source: InteractionSource,
  ): void {
    if (keys.length === 0) return;
    const next = nextPointSelectionKeys(
      effectiveSelectedKeys,
      keys,
      interactionConfig.select?.multiple ?? false,
    );
    commitPointSelection(next, source);
  }

  function onSurfaceKeyDown(event: KeyboardEvent): void {
    // Decision table is pure (plot-surface-keyboard); this switch owns side
    // effects only. brushCorners is the draft source of truth (not reducer
    // brushing); nudge/complete-area carry pure payloads so host only applies.
    const { action, preventDefault } = resolveSurfaceKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      activeTool,
      brushCorners: brushRect,
      hasInspection: inspection !== null,
      pinEnabled,
      focusKey: inspection?.focus.key ?? null,
      sourceKeys: inspection?.focus.sourceKeys ?? [],
      inspectionAnchor: inspection?.focus.anchor ?? null,
      inspectionPanel,
      firstPanel: model?.scene.panels[0],
    });
    if (preventDefault) event.preventDefault();
    switch (action.type) {
      case "nudge-brush": {
        // Pure table owns clamp panel policy and free-corner nudge.
        brushRect = action.corners;
        reducer.dispatch({
          type: "move-area",
          point: { x: action.corners.x1, y: action.corners.y1 },
        });
        return;
      }
      case "begin-area": {
        // Pure table owns inspection-anchor vs panel-center policy.
        // R3: the brush is panel-scoped — anchor to the panel under it.
        const originPanel = panelAtPoint(action.anchor);
        if (originPanel === null) return;
        brushRect = brushAtPoint(action.anchor);
        reducer.dispatch({
          type: "begin-area",
          point: action.anchor,
          panelId: originPanel.id,
        });
        announcer.announce(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        return;
      }
      case "complete-area": {
        // finish payload is pure-owned (normalize + select/zoom/end routing).
        applyFinishBrush(action.finish, "keyboard");
        return;
      }
      case "cycle-coincident":
        cycleCoincident(action.delta);
        return;
      case "navigate-direction":
        navigateDirection(action.dx, action.dy);
        return;
      case "toggle-point-keys":
        togglePointKeys(action.keys, "keyboard");
        return;
      case "toggle-pin":
        toggleInspectionPin("keyboard");
        return;
      case "escape":
        dismissInspection("escape", "keyboard", {
          returnToInspect: action.returnToInspect,
        });
        break;
      case "none":
        break;
    }
  }

  function onCaptureClick(event: MouseEvent): void {
    const action = resolveCaptureClickAction({
      suppressClick: performance.now() < suppressClickUntil,
      activeTool,
      pointSelectEnabled: canPublishPointSelection,
      inspectEnabled,
      pinEnabled,
      hasInspection: inspection !== null,
    });
    switch (action.type) {
      case "suppress":
        suppressClickUntil = 0;
        break;
      case "toggle-point": {
        const point = plotPoint(event);
        const match = model?.candidates.nearest(point.x, point.y, {
          mode: "xy",
          maxDistance: POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
        });
        if (match === null || match === undefined) break;
        togglePointKeys(candidateSemanticKeys(match), "pointer");
        break;
      }
      case "toggle-pin":
        toggleInspectionPin("pointer");
        break;
      case "none":
        break;
    }
  }

  /** Pointer-cancel always drops draft/queue/touch-inspect and cancels area. */
  function onPointerCancel(): void {
    queuedPointerInspection = null;
    touchInspectStart = null;
    touchInspectMoved = false;
    reducer.cancelScheduledPointer();
    brushRect = null;
    reducer.dispatch({ type: "cancel-area" });
  }

  /**
   * Lost capture: pure decision table owns keep vs clear draft; host mutates
   * brushRect and always cancels area when not ignored.
   */
  function onLostPointerCapture(): void {
    const lost = resolveLostPointerCaptureAction(reducer.state.area.kind);
    switch (lost.type) {
      case "ignore":
        break;
      case "cancel-keep-draft":
        reducer.dispatch({ type: "cancel-area" });
        break;
      case "cancel-clear-draft":
        brushRect = null;
        reducer.dispatch({ type: "cancel-area" });
        break;
    }
  }

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
      onChooseTool={chooseTool}
      onResetZoom={zoomState.resetZoom}
      onClearPointSelection={clearPointSelection}
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
          if (inspection === null) navigate(1);
        }}
        onBlur={onSurfaceBlur}
        {onPointerMove}
        {onPointerLeave}
        {onPointerDown}
        {onPointerUp}
        {onPointerCancel}
        {onLostPointerCapture}
        onClick={onCaptureClick}
        onKeyDown={onSurfaceKeyDown}
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
            if (inspection?.state !== "pinned") setInspection(null, "pointer");
          }}
          onclose={(source) => closeInspection(source, true)}
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
