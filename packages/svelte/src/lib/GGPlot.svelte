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
   * Reactivity: spec assembly is $derived; runPipeline runs in $derived.by
   * with run-id gating; the committed scale state lives in a NON-reactive box
   * (never read-modify-write shared reactive state across init/teardown —
   * decision 0001, finding 3). That box is what makes discrete colors
   * value-stable across data changes AND across brush-to-zoom respecs.
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
  import { untrack, type Snippet } from "svelte";

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
    ScaleState,
  } from "@ggsvelte/core";
  import {
    buildInteractionMasks,
    planStrata,
    runPipeline,
    sceneLabel,
  } from "@ggsvelte/core";
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
  import {
    brushAtPoint,
    brushWithEnd,
    evaluatePointerBrushEnd,
    initialBrushRect,
    nudgeBrushEnd,
    panelCenterAnchor,
  } from "./plot-area-brush.js";
  import {
    frozenZoomDomains,
    normalizedRect,
    panelContainingAnchor,
  } from "./plot-geometry.js";
  import { resolveSurfaceKeyAction } from "./plot-surface-keyboard.js";
  import {
    buildInspectionCandidateRef,
    buildQueuedInspectFrame,
    planInspectionDismiss,
    planSceneInspectReconcile,
    resolveInspectionCompleteness,
    resolveInspectionEmitAction,
    resolveInspectionMode,
    resolveQueuedInspectFrameAction,
    resolveSetInspectionAction,
    resolveSurfaceBlurAction,
    resolveToggleInspectionPinAction,
    shouldAnnounceUnpin,
    shouldClearInspectionAnnouncement,
    shouldClosePinnedOnOutsidePointer,
    shouldCommitInspection,
    shouldFocusPinnedInteractiveTooltip,
    type QueuedPointerInspection,
  } from "./plot-surface-inspection.js";
  import {
    resolveCaptureClickAction,
    advanceTouchInspectMoved,
    isAreaAwaitingSecond,
    isAreaBrushing,
    resolveFinishBrushAction,
    resolveLostPointerCaptureAction,
    resolvePointerDownAction,
    resolvePointerMoveAction,
    resolvePointerUpAction,
    shouldClearInspectionOnPointerLeave,
    POINT_SELECT_NEAREST_MAX_DISTANCE_PX,
    TOUCH_INSPECT_CLICK_SUPPRESS_MS,
  } from "./plot-surface-pointer.js";
  import {
    resolveLegendClearControlSource,
    resolveLegendClickAction,
    resolveLegendCommitAction,
    resolveLegendKeyAction,
    resolveLegendPointerUpAction,
    resolveLegendPreviewDismissAction,
    shouldClearLegendPreviewOnBlur,
    shouldEmitLegendFocusClear,
    shouldRenderInteractionLiveRegion,
  } from "./plot-legend-surface.js";
  import {
    BRUSH_SECOND_CORNER_ANNOUNCEMENT,
    datumLabel as datumLabelFor,
    inspectionLiveText as inspectionLiveTextFor,
    legendFocusAnnouncement,
    markLabel as markLabelFor,
    resolveInteractionLiveText,
    selectionAnnouncement,
    zoomAnnouncement,
  } from "./plot-labels.js";
  import {
    isNarrowToolsWidth,
    isTooltipDocked,
    plotRootInlineStyle,
    plotTooltipDomId,
    resolveCaptureAriaControls,
    resolveClearLegendX,
    resolvePlotSize,
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
    clearIntervalSelectionEvent,
    persistentSelectionOrNull,
  } from "./plot-interval.js";
  import {
    buildIntervalSelectionFromScene,
    intervalQuerySceneFromModel,
    type IntervalQueryScene,
  } from "./plot-interval-query.js";
  import { createPaintLedger, isPlotReady } from "./plot-paint.js";
  import {
    anchorsFromCandidateKeys,
    buildPointSelectionEvent,
    collectCandidates,
    iterateCandidates,
    mergePresentationFocusKeys,
    nextPointSelectionKeys,
    rowIndexesForCandidate,
    sameOrderedPropertyKeys,
    uniqueKeysFromRowIndexes,
  } from "./plot-selection.js";
  import {
    createSourceIdentityTracker,
    dataIdentityEpochToken,
    resolveSemanticKeysForPlot,
  } from "./plot-semantic-keys.js";
  import { themeTokensToCss } from "./plot-theme-css.js";
  import {
    applyZoomToSpec,
    buildZoomEvent,
    continuousZoomDomainsFromScopes,
    filterScopeChannelsByZoomMode,
    filterZoomDomainsByMode,
    resolveBrushZoomDomains,
    sanitizePartialZoomDomains,
    stableZoomDomains,
  } from "./plot-zoom.js";
  import {
    buildInteractiveLegendEntries,
    buildLegendEntryKeyIndexForPlot,
    findLegendPressedIdentity,
    keysForLegendEntry,
    legendInteractionSource,
    moveLegendRovingIndex,
    planLegendCommittedReconcile,
    planLegendFocusDisabledClear,
    planLegendRovingFocusSync,
    reconcileLegendPreview,
    resolveLegendEmphasisKeys,
    resolveLegendPreviewKeysDecision,
    samePropertyKeySet,
    type LegendEntryAction,
    type LegendEntryIdentity,
  } from "./plot-legend-focus.js";
  import PlotCaptureSurface from "./PlotCaptureSurface.svelte";
  import PlotLegendTargets from "./PlotLegendTargets.svelte";
  import PlotMarkStrata from "./PlotMarkStrata.svelte";
  import PlotSceneOverlays from "./PlotSceneOverlays.svelte";
  import PlotStatusChrome from "./PlotStatusChrome.svelte";
  import Tooltip from "./Tooltip.svelte";
  import ToolRail from "./ToolRail.svelte";

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
    tool,
    interaction,
    interactionScope,
    ariaLabel,
    oninspect,
    onselect,
    onzoom,
    onlegendfocus,
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

  // ------------------------------------------------------------ zoom respec
  let localZoomDomains = $state<ZoomDomains | null>(null);
  // Memoize prior bag so selection/emphasis revisions do not retrain zoom.
  let previousEffectiveZoomDomains: ZoomDomains | null = null;
  const controllerRevision = $derived(interaction?.revision ?? 0);
  const effectiveZoomDomains: ZoomDomains | null = $derived.by(() => {
    void controllerRevision;
    let next: ZoomDomains | null;
    if (interaction === undefined) {
      next = localZoomDomains;
    } else {
      // Gate shared domains by this plot's resolved zoom mode (null when
      // disabled / faceted-unsupported) so x-only plots ignore y domains.
      next = filterZoomDomainsByMode(
        interaction.zoom(resolvedInteractionScope),
        interactionConfig.zoom?.mode ?? null,
      );
    }
    next = stableZoomDomains(previousEffectiveZoomDomains, next);
    previousEffectiveZoomDomains = next;
    return next;
  });

  const effectiveSpec: PortableSpec | null = $derived.by(() => {
    if (assembled === null || effectiveZoomDomains === null) return assembled;
    return applyZoomToSpec(assembled, effectiveZoomDomains);
  });

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

  // ------------------------------------------------- container width (RO)
  let containerWidth = $state<number | null>(null);
  let containerHasPositiveWidth = $state(false);
  let root = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if ((width !== undefined && width !== "container") || root === null) return;
    const el = root;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      // Debounce resize storms through rAF; the pipeline's run-id gate
      // guarantees only the newest result commits regardless.
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
      containerHasPositiveWidth = nextWidth > 0;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (nextWidth > 0) containerWidth = nextWidth;
      });
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });

  const resolvedSize = $derived(
    resolvePlotSize({
      width,
      height,
      containerWidth,
      assembledWidth: assembled?.width,
      assembledHeight: assembled?.height,
    }),
  );
  const resolvedWidth = $derived(resolvedSize.width);
  const resolvedHeight = $derived(resolvedSize.height);

  // Authoritative committed scale state: a plain non-reactive box + run-id
  // gate. Committing only monotonically newer runs keeps stale results from
  // clobbering the value-stable color assignments. scaleEpoch exists so
  // resetScales() can force a re-run after clearing the box.
  const scaleBox: {
    runId: number;
    scales: Record<string, ScaleState> | undefined;
  } = { runId: -1, scales: undefined };
  let scaleEpoch = $state(0);

  const model: RenderModel | null = $derived.by(() => {
    void scaleEpoch;
    if (effectiveSpec === null) return null;
    const m = runPipeline(effectiveSpec, {
      width: resolvedWidth,
      height: resolvedHeight,
      ...(scaleBox.scales !== undefined && { prevScales: scaleBox.scales }),
      ...(effectiveZoomDomains !== null && {
        baselineScales: assembled?.scales ?? {},
      }),
    });
    if (m.runId > scaleBox.runId) {
      scaleBox.runId = m.runId;
      scaleBox.scales = m.scales.state;
    }
    return m;
  });

  /**
   * Clear the committed scale state (grow-mode recovery: dropped categories
   * lose their reserved colors) and any brush zoom. The next render trains
   * scales fresh from the current data.
   */
  export function resetScales(): void {
    scaleBox.runId = -1;
    scaleBox.scales = undefined;
    if (interaction === undefined) localZoomDomains = null;
    else
      interaction.resetZoom({
        scope: filterScopeChannelsByZoomMode(
          resolvedInteractionScope,
          interactionConfig.zoom?.mode ?? null,
        ),
      });
    scaleEpoch++;
  }

  // Memory ownership: dispose the previous model once the DOM has moved on
  // (effect cleanup runs post-flush), and the last model on unmount.
  $effect(() => {
    const m = model;
    return () => m?.dispose();
  });

  $effect(() => {
    if (model !== null && assembled !== null)
      untrack(() => onrender?.(model, assembled));
  });

  // ---------------------------------------------------------- strata plan
  const strata = $derived(
    model === null ? [] : planStrata(model.scene, model.layerBackends),
  );
  const canvasCount = $derived(
    strata.filter((s) => s.backend === "canvas").length,
  );
  const hasCanvas = $derived(canvasCount > 0);

  // Canvas first-paint tracking: data-gg-ready waits for every distinct
  // canvas stratum of the CURRENT model to have painted at least once.
  // paintEpoch bumps so readiness re-derives when the non-reactive ledger
  // mutates (ledger itself must not be $state — set mutations are invisible).
  const paintLedger = createPaintLedger();
  let paintEpoch = $state(0);
  function notifyPainted(runId: number, stratumKey: string): void {
    paintLedger.notify(runId, stratumKey);
    paintEpoch += 1;
  }

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
  let inspection = $state<PlotInspectionChange<
    Record<string, CellValue>,
    PropertyKey
  > | null>(null);
  let inspectionSeed: CandidateFacts | null = null;
  let interactionAnnouncement = $state("");
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
  let localEmphasisKeys = $state<PropertyKey[]>([]);
  let legendPreview = $state<{
    action: LegendEntryAction;
    keys: readonly PropertyKey[];
  } | null>(null);
  let legendCommitted = $state<{
    identity: LegendEntryIdentity;
    keys: readonly PropertyKey[];
  } | null>(null);
  let legendRovingIndex = $state(0);
  let legendTouchIndex = -1;
  let legendClearPointerType: string | null = null;
  let suppressLegendClick = false;
  let suppressLegendFocusPreview = false;
  const effectiveSelectedKeys: readonly PropertyKey[] = $derived.by(() => {
    void controllerRevision;
    return interaction?.selected(resolvedInteractionScope) ?? localSelectedKeys;
  });
  const effectiveEmphasisKeys: readonly PropertyKey[] = $derived.by(() => {
    void controllerRevision;
    return resolveLegendEmphasisKeys({
      legendFocusEnabled: interactionConfig.legendFocus !== null,
      previewKeys: legendPreview?.keys ?? null,
      controllerKeys:
        interaction === undefined
          ? null
          : interaction.emphasized(resolvedInteractionScope),
      localKeys: localEmphasisKeys,
    });
  });
  let committedInterval = $state<IntervalSelection | null>(null);
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
  const hasIntervalSelection = $derived(committedInterval !== null);
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
      interactionConfig.legendFocus !== null,
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
      containerWidth: width === undefined || width === "container",
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
  const selectedAnchors = $derived(anchorsForKeys(effectiveSelectedKeys));
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

  function clearIntervalSelection(source: InteractionSource): void {
    if (committedInterval === null) return;
    const event = clearIntervalSelectionEvent(committedInterval, source);
    committedInterval = null;
    emitSelection(event);
  }

  function emitSelection(event: PlotSelection): void {
    const message = selectionAnnouncement(event);
    if (message !== null) announceInteraction(message);
    onselect?.(event as unknown as PlotSelection<PublicKey>);
    oninteraction?.(event as unknown as PlotInteractionEvent<Row, PublicKey>);
  }

  function announceInteraction(message: string): void {
    interactionAnnouncement = "";
    queueMicrotask(() => {
      interactionAnnouncement = message;
    });
  }
  const plotId = $props.id();
  // Owned for the component lifetime; resolveSemanticKeys mutates in place.
  const priorKeys = new Map<string, PropertyKey>();

  const semanticKeys = $derived.by(() =>
    resolveSemanticKeysForPlot({
      model:
        model === null
          ? null
          : {
              candidates: model.candidates,
              lineage: model.lineage,
              row: (rowIndex) => model.row(rowIndex),
            },
      layers: assembled?.layers ?? [],
      datumKey: datumKey as
        string | ((row: never, index: number) => PropertyKey) | undefined,
      priorKeys,
      dataToken: sourceIdentity(data),
      specToken: sourceIdentity(spec),
    }),
  );

  $effect(() => {
    for (const diagnostic of semanticKeys.diagnostics)
      deliverDiagnostic(diagnostic);
  });

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

  function semanticKey(
    row: Record<string, CellValue> | null,
    index: number | null,
  ): PropertyKey | null {
    if (row === null || index === null || datumKey === undefined) return null;
    return semanticKeys.keys.get(index) ?? null;
  }

  function candidateSemanticKeys(candidate: CandidateFacts): PropertyKey[] {
    if (model === null) return [];
    const rows = rowIndexesForCandidate(
      candidate,
      model.lineage.keys(candidate.lineage),
    );
    return uniqueKeysFromRowIndexes(rows, (rowIndex) =>
      semanticKey(model.row(rowIndex), rowIndex),
    );
  }

  const legendEntryKeyIndex: ReadonlyMap<string, readonly PropertyKey[]> =
    $derived.by(() =>
      buildLegendEntryKeyIndexForPlot({
        model:
          model === null
            ? null
            : {
                scene: model.scene,
                candidates: model.candidates,
                layerFields: model.layerFields,
                layerScaledConstants: model.layerScaledConstants,
                lineage: model.lineage,
                row: (rowIndex) => model.row(rowIndex),
              },
        semanticKey: (rowIndex) => semanticKeys.keys.get(rowIndex),
      }),
    );

  function keysForLegend(action: LegendEntryAction): readonly PropertyKey[] {
    return keysForLegendEntry(legendEntryKeyIndex, action.identity);
  }

  function emitLegendFocus(event: LegendFocusEvent<PropertyKey>): void {
    announceInteraction(legendFocusAnnouncement(event));
    onlegendfocus?.(event as LegendFocusEvent<PublicKey>);
    oninteraction?.(event as PlotInteractionEvent<Row, PublicKey>);
  }

  function previewLegend(action: LegendEntryAction | null): void {
    if (action === null) {
      // Decision table is pure (plot-legend-surface); host owns emit + mutation.
      // Emit gate uses committed emphasis, not effectiveEmphasisKeys (preview).
      // Pure table maps preview source → InteractionSource on non-none actions.
      const dismiss = resolveLegendPreviewDismissAction({
        previewSource: legendPreview?.action.source ?? null,
        committedEmphasisEmpty:
          (
            interaction?.emphasized(resolvedInteractionScope) ??
            localEmphasisKeys
          ).length === 0,
      });
      if (dismiss.type === "none") return;
      legendPreview = null;
      if (dismiss.type === "clear-and-emit")
        emitLegendFocus({
          type: "legend-focus",
          phase: "clear",
          source: dismiss.source,
        });
      return;
    }
    const decision = resolveLegendPreviewKeysDecision(keysForLegend(action));
    if (decision.type === "clear") {
      // Empty domain entry: do not leave the previous entry's preview active.
      previewLegend(null);
      return;
    }
    legendPreview = { action, keys: decision.keys };
    emitLegendFocus({
      type: "legend-focus",
      phase: "change",
      state: "transient",
      source: legendInteractionSource(action.source),
      scale: action.identity.scale as "color" | "fill",
      value: action.entry.value as CellValue,
      label: action.entry.label,
      keys: decision.keys,
    });
  }

  function clearLegendFocus(source: InteractionSource): void {
    const emitClear = shouldEmitLegendFocusClear({
      hasPreview: legendPreview !== null,
      hasCommitted: legendCommitted !== null,
      emphasisKeyCount: effectiveEmphasisKeys.length,
    });
    legendPreview = null;
    legendCommitted = null;
    if (interaction === undefined) localEmphasisKeys = [];
    else interaction.clearEmphasis({ scope: resolvedInteractionScope, source });
    if (emitClear)
      emitLegendFocus({ type: "legend-focus", phase: "clear", source });
  }

  function clearLegendFromControl(event: MouseEvent): void {
    const returnTarget = root?.querySelector<HTMLElement>(
      ".gg-legend-target[aria-pressed='true']",
    );
    const source = resolveLegendClearControlSource({
      detail: event.detail,
      pointerType: legendClearPointerType,
    });
    legendClearPointerType = null;
    clearLegendFocus(source);
    queueMicrotask(() => {
      if (returnTarget === null || returnTarget === undefined) return;
      suppressLegendFocusPreview = true;
      returnTarget.focus();
      suppressLegendFocusPreview = false;
    });
  }

  function commitLegend(action: LegendEntryAction): void {
    // Eager key lookup (O(1) Map.get) before pure routing; unused on toggle-clear.
    const keys = keysForLegend(action);
    const commit = resolveLegendCommitAction({
      pressed: effectiveLegendPressed,
      identity: action.identity,
      keyCount: keys.length,
      entrySource: action.source,
    });
    switch (commit.type) {
      case "toggle-clear":
        clearLegendFocus(commit.source);
        break;
      case "ignore":
        break;
      case "commit":
        legendPreview = null;
        legendCommitted = { identity: action.identity, keys };
        if (interaction === undefined) localEmphasisKeys = [...keys];
        else
          interaction.setEmphasis(keys as readonly PublicKey[], {
            scope: resolvedInteractionScope,
            source: commit.source,
          });
        emitLegendFocus({
          type: "legend-focus",
          phase: "change",
          state: "committed",
          source: commit.source,
          scale: action.identity.scale as "color" | "fill",
          value: action.entry.value as CellValue,
          label: action.entry.label,
          keys,
        });
        break;
    }
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

  const interactiveLegendEntries = $derived.by(() => {
    if (model === null || interactionConfig.legendFocus === null) return [];
    return buildInteractiveLegendEntries(model.scene.legends);
  });

  const effectiveLegendPressed: LegendEntryIdentity | null = $derived.by(() => {
    const keys =
      interaction?.emphasized(resolvedInteractionScope) ?? localEmphasisKeys;
    if (keys.length === 0 || model === null) return null;
    // Match against all discrete scene legends (not only interactive targets).
    return findLegendPressedIdentity({
      keys,
      entries: buildInteractiveLegendEntries(model.scene.legends),
      keyIndex: legendEntryKeyIndex,
      committed: legendCommitted,
    });
  });

  $effect.pre(() => {
    const count = interactiveLegendEntries.length;
    const active = document.activeElement;
    // Number(dataset.index) may be NaN — pure plan maps non-finite → 0.
    const focusedIndex =
      active instanceof HTMLElement &&
      active.matches("[data-gg-legend-target]") &&
      root?.contains(active)
        ? Number(active.dataset["index"])
        : null;
    const plan = planLegendRovingFocusSync({
      currentRoving: legendRovingIndex,
      entryCount: count,
      focusedIndex,
    });
    if (plan.nextIndex !== legendRovingIndex)
      legendRovingIndex = plan.nextIndex;
    if (plan.type !== "refocus") return;
    const returnIndex = plan.returnIndex;
    queueMicrotask(() => {
      root
        ?.querySelector<HTMLElement>(
          `[data-gg-legend-target][data-index="${String(returnIndex)}"]`,
        )
        ?.focus();
    });
  });

  $effect(() => {
    const plan = planLegendCommittedReconcile({
      committed: legendCommitted,
      entries: interactiveLegendEntries,
      keyIndex: legendEntryKeyIndex,
      usesLocalEmphasis: interaction === undefined,
      localEmphasisCount: localEmphasisKeys.length,
    });
    switch (plan.type) {
      case "noop":
        return;
      case "clear-committed":
        legendCommitted = null;
        break;
      case "clear-committed-local-emit":
        legendCommitted = null;
        localEmphasisKeys = [];
        emitLegendFocus({
          type: "legend-focus",
          phase: "clear",
          source: "programmatic",
        });
        break;
    }
  });

  // Reconcile transient preview when data/domain reshuffles entry membership.
  $effect(() => {
    const preview = legendPreview;
    if (preview === null) return;
    const next = reconcileLegendPreview({
      preview: { identity: preview.action.identity, keys: preview.keys },
      entries: interactiveLegendEntries,
      keyIndex: legendEntryKeyIndex,
    });
    if (next === null) {
      previewLegend(null);
      return;
    }
    if (samePropertyKeySet(next.keys, preview.keys)) return;
    legendPreview = {
      action: { ...preview.action, identity: next.identity },
      keys: next.keys,
    };
  });

  // Drop chart-local emphasis when legend focus is turned off at runtime.
  $effect(() => {
    const plan = planLegendFocusDisabledClear({
      legendFocusEnabled: interactionConfig.legendFocus !== null,
      hasPreview: legendPreview !== null,
      hasCommitted: legendCommitted !== null,
      hasLocalEmphasis: localEmphasisKeys.length > 0,
      usesLocalEmphasis: interaction === undefined,
    });
    switch (plan.type) {
      case "noop":
        return;
      case "clear-host":
        legendPreview = null;
        legendCommitted = null;
        break;
      case "clear-host-local":
        legendPreview = null;
        legendCommitted = null;
        localEmphasisKeys = [];
        break;
    }
  });

  function legendAction(
    index: number,
    source: LegendEntryAction["source"],
  ): LegendEntryAction | null {
    const target = interactiveLegendEntries[index];
    return target === undefined
      ? null
      : { identity: target.identity, entry: target.entry, source };
  }

  function previewLegendIndex(
    index: number,
    source: "pointer" | "focus",
  ): void {
    if (interactionConfig.legendFocus?.preview !== true) return;
    previewLegend(legendAction(index, source));
  }

  function onLegendFocus(index: number): void {
    if (suppressLegendFocusPreview) return;
    previewLegendIndex(index, "focus");
  }

  function moveLegendFocus(index: number, key: string): void {
    const next = moveLegendRovingIndex(
      index,
      key,
      interactiveLegendEntries.length,
    );
    legendRovingIndex = next;
    root
      ?.querySelector<HTMLElement>(
        `[data-gg-legend-target][data-index="${String(next)}"]`,
      )
      ?.focus();
  }

  function onLegendKeydown(event: KeyboardEvent, index: number): void {
    // Decision table is pure (plot-legend-surface); this switch owns side
    // effects only. Roving move, commit, and clear stay host-owned.
    const { action, preventDefault } = resolveLegendKeyAction({
      key: event.key,
    });
    if (preventDefault) event.preventDefault();
    switch (action.type) {
      case "move":
        moveLegendFocus(index, action.key);
        break;
      case "commit": {
        const next = legendAction(index, "keyboard");
        if (next !== null) commitLegend(next);
        break;
      }
      case "clear":
        clearLegendFocus("keyboard");
        break;
      case "none":
        break;
    }
  }

  function onLegendPointerDown(event: PointerEvent, index: number): void {
    if (event.pointerType === "touch") legendTouchIndex = index;
  }

  function onLegendPointerUp(event: PointerEvent, index: number): void {
    // Pure gate: touch + matching legendTouchIndex. Host always clears the
    // index and sets suppressLegendClick on touch-commit (exact-once with the
    // synthetic click). pointercancel clears the index in the template.
    const resolved = resolveLegendPointerUpAction({
      pointerType: event.pointerType,
      index,
      touchIndex: legendTouchIndex,
    });
    switch (resolved.type) {
      case "touch-commit": {
        legendTouchIndex = -1;
        suppressLegendClick = true;
        const next = legendAction(index, "touch");
        if (next !== null) commitLegend(next);
        break;
      }
      case "none":
        break;
    }
  }

  function onLegendClick(event: MouseEvent, index: number): void {
    // Pure priority: suppress (after touch) outranks detail-classified commit.
    // detail === 0 is current source classification (not an a11y guarantee).
    const resolved = resolveLegendClickAction({
      suppressClick: suppressLegendClick,
      detail: event.detail,
    });
    switch (resolved.type) {
      case "suppress":
        suppressLegendClick = false;
        break;
      case "commit": {
        const next = legendAction(index, resolved.source);
        if (next !== null) commitLegend(next);
        break;
      }
    }
  }

  function onLegendBlur(event: FocusEvent): void {
    if (
      !shouldClearLegendPreviewOnBlur({
        relatedTarget: event.relatedTarget,
        root,
      })
    )
      return;
    previewLegend(null);
  }

  const inspectionCoordinator = createInspectionCoordinator<
    Record<string, CellValue>,
    PropertyKey
  >((_row, index) => semanticKeys.keys.get(index) ?? null);

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
      inspectionEnabled: interactionConfig.inspect !== null,
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
      interactionAnnouncement = "";
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
      hasPendingPinned: pendingPinnedPointer !== null,
    });
    if (pinAction.type === "ignore") return;
    // toggle-pin always runs before restore/flip side effects; if flip
    // resolve returns null the reducer stays toggled (no rollback).
    reducer.dispatch({ type: "toggle-pin", source });
    switch (pinAction.type) {
      case "restore-pending": {
        const pending = pendingPinnedPointer!;
        pendingPinnedPointer = null;
        inspectionCoordinator.release("pinned");
        inspection = null;
        inspectionSeed = null;
        setInspection(
          pending.hit,
          pending.source,
          "transient",
          pending.concreteMode,
          pending.candidate,
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
          announceInteraction(
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
      inspectEnabled: interactionConfig.inspect !== null,
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
        const inspectConfig = interactionConfig.inspect;
        if (inspectConfig === null) return;
        const match =
          model?.candidates.nearest(p.x, p.y, {
            mode: inspectConfig.mode,
            maxDistance: inspectConfig.maxDistance,
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
    return intervalQuerySceneFromModel(
      model,
      assembled?.coord?.type === "flip",
    );
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
    const action = resolvePointerDownAction({
      pointerType: event.pointerType,
      button: event.button,
      activeTool,
      areaAwaitingSecond,
      hasBrushDraft: brushRect !== null,
    });
    switch (action.type) {
      case "touch-inspect-start":
        touchInspectStart = plotPoint(event);
        touchInspectMoved = false;
        break;
      case "none":
        break;
      case "begin-area": {
        const p = plotPoint(event);
        brushRect = initialBrushRect({
          extendExisting: action.extendExisting,
          existing: brushRect,
          point: p,
        });
        setInspection(null, action.source);
        reducer.dispatch({
          type: "begin-area",
          point: p,
          panelId: panelId(0),
        });
        if (action.emitSelectStart) {
          const startEvent = selectionEvent(
            "start",
            normalizedRect(brushRect),
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
    return buildIntervalSelectionFromScene({
      phase,
      mode: interactionConfig.select?.mode ?? "xy",
      source,
      pixels: rect,
      scene: intervalQueryScene(),
      keyForRow: (rowIndex) =>
        semanticKey(model?.row(rowIndex) ?? null, rowIndex),
    });
  }

  function onPointerUp(event: PointerEvent): void {
    const action = resolvePointerUpAction({
      pointerType: event.pointerType,
      activeTool,
      inspectEnabled: interactionConfig.inspect !== null,
      pinEnabled: interactionConfig.inspect?.pin === true,
      hasTouchInspectStart: touchInspectStart !== null,
      touchInspectMoved,
      brushing,
      hasBrushDraft: brushRect !== null,
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
        const inspectConfig = interactionConfig.inspect;
        if (inspectConfig === null) break;
        const p = plotPoint(event);
        const match = model?.candidates.nearest(p.x, p.y, {
          mode: inspectConfig.mode,
          maxDistance: inspectConfig.maxDistance,
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
        // Defensive: pure up-gate already requires hasBrushDraft.
        if (brushRect === null) break;
        reducer.cancelScheduledPointer();
        const source = action.source;
        const ended = evaluatePointerBrushEnd(brushRect, plotPoint(event));
        // Pure table carries rect/corners — no host ended.kind re-narrow.
        const finish = resolveFinishBrushAction({
          ended,
          activeTool,
        });
        switch (finish.type) {
          case "keep-second-corner":
            brushRect = finish.corners;
            announceInteraction(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
            break;
          case "select-end": {
            brushRect = null;
            const eventValue = selectionEvent("end", finish.rect, source);
            committedInterval = persistentSelectionOrNull(
              interactionConfig.select?.persistent,
              eventValue,
            );
            emitSelection(eventValue);
            reducer.dispatch({ type: "cancel-area" });
            break;
          }
          case "zoom-end":
            brushRect = null;
            applyBrushZoom(finish.rect, source);
            reducer.dispatch({ type: "cancel-area" });
            break;
          case "end-area":
            // Commit with non-area tool (e.g. tool changed mid-drag): clear only.
            brushRect = null;
            reducer.dispatch({ type: "cancel-area" });
            break;
        }
        break;
      }
    }
  }

  function commitZoom(
    domains: ZoomDomains | null,
    source: InteractionSource,
  ): void {
    let committed: ZoomDomains | null = domains;
    if (interaction === undefined) {
      if (domains === null && localZoomDomains === null) return;
      localZoomDomains = domains;
    } else {
      // Match filterZoomDomainsByMode: x-only plots must not mutate shared y.
      const mutationScope = filterScopeChannelsByZoomMode(
        resolvedInteractionScope,
        interactionConfig.zoom?.mode ?? null,
      );
      const transition =
        domains === null
          ? interaction.resetZoom({ scope: mutationScope, source })
          : interaction.setZoom(domains, {
              scope: mutationScope,
              source,
            });
      if (transition === null) return;
      if (domains !== null) {
        committed = frozenZoomDomains(
          continuousZoomDomainsFromScopes(
            transition.snapshot.zoom,
            mutationScope.x,
            mutationScope.y,
          ),
        );
      }
    }
    const event = buildZoomEvent(committed, source);
    announceInteraction(zoomAnnouncement(committed));
    onzoom?.(event);
    oninteraction?.(event);
  }

  function resetZoom(source: InteractionSource = "programmatic"): void {
    if (effectiveZoomDomains === null) return;
    commitZoom(null, source);
  }

  /** Replace one or both continuous zoom domains without disturbing the
   *  other channel. This is the controlled linking/programmatic-zoom path. */
  export function setZoom(domains: Partial<ZoomDomains>): void {
    const next = sanitizePartialZoomDomains(
      domains,
      model?.scales,
      effectiveZoomDomains,
    );
    if (next === null) return;
    commitZoom(frozenZoomDomains(next), "programmatic");
  }

  function onDblClick(): void {
    if (interactionConfig.zoom === null) return;
    resetZoom("pointer");
  }

  /**
   * Brush-to-zoom = an intentional respec: invert the brushed plot-px rect
   * through the trained scales into explicit continuous domains. Band axes
   * and faceted plots are skipped (documented M2 limitation).
   */
  function applyBrushZoom(
    rect: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    },
    source: InteractionSource,
  ): void {
    if (model === null || model.scene.panels.length !== 1) return;
    const panel = model.scene.panels[0]!;
    const flip = assembled?.coord?.type === "flip";
    const next = resolveBrushZoomDomains(
      rect,
      panel,
      model.scales,
      flip,
      interactionConfig.zoom?.mode ?? "xy",
      effectiveZoomDomains,
    );
    if (next === null) return;
    commitZoom(frozenZoomDomains(next), source);
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
    // effects only. hasBrushDraft tracks brushRect, not reducer brushing.
    const { action, preventDefault } = resolveSurfaceKeyAction({
      key: event.key,
      shiftKey: event.shiftKey,
      activeTool,
      hasBrushDraft: brushRect !== null,
      hasInspection: inspection !== null,
      pinEnabled: interactionConfig.inspect?.pin === true,
      focusKey: inspection?.focus.key ?? null,
      sourceKeys: inspection?.focus.sourceKeys ?? [],
    });
    if (preventDefault) event.preventDefault();
    switch (action.type) {
      case "nudge-brush": {
        const panel = inspectionPanel ?? model?.scene.panels[0];
        if (panel === undefined || brushRect === null) return;
        brushRect = nudgeBrushEnd(brushRect, action.dx, action.dy, panel);
        reducer.dispatch({
          type: "move-area",
          point: { x: brushRect.x1, y: brushRect.y1 },
        });
        return;
      }
      case "begin-area": {
        const anchor =
          inspection?.focus.anchor ?? panelCenterAnchor(model?.scene.panels[0]);
        brushRect = brushAtPoint(anchor);
        reducer.dispatch({
          type: "begin-area",
          point: anchor,
          panelId: panelId(0),
        });
        announceInteraction(BRUSH_SECOND_CORNER_ANNOUNCEMENT);
        return;
      }
      case "complete-area": {
        if (brushRect === null) return;
        const rect = normalizedRect(brushRect);
        brushRect = null;
        if (action.finish === "select") {
          const selection = selectionEvent("end", rect, "keyboard");
          committedInterval = persistentSelectionOrNull(
            interactionConfig.select?.persistent,
            selection,
          );
          emitSelection(selection);
        } else applyBrushZoom(rect, "keyboard");
        reducer.dispatch({ type: "cancel-area" });
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
      pointSelectEnabled: interactionConfig.select?.type === "point",
      inspectEnabled: interactionConfig.inspect !== null,
      pinEnabled: interactionConfig.inspect?.pin === true,
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

  // Readiness signal for screenshot tooling (plan: VR waits on
  // `[data-gg-ready="true"]`). Split into:
  // - clientFlush via $effect: never runs during SSR → prerender stays
  //   data-gg-ready="false" until the first client committed flush (decision 0009)
  // - derived isPlotReady: updates in the same render when prerequisites flip
  //   (e.g. model cleared, canvas paint incomplete) so VR cannot accept a
  //   stale ready=true mid-transition. Canvas strata gate on first paint
  //   (decision 0006 / plan).
  let clientFlush = $state(false);
  $effect(() => {
    clientFlush = true;
  });
  const ready = $derived.by(() => {
    void paintEpoch;
    if (!clientFlush) return false;
    return isPlotReady({
      hasModel: model !== null,
      widthMode:
        width === undefined || width === "container" ? "container" : "fixed",
      containerHasPositiveWidth,
      hasCanvas,
      paintComplete:
        model !== null && paintLedger.isComplete(model.runId, canvasCount),
    });
  });
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
  class:gg-container-width={width === undefined || width === "container"}
  class:gg-with-tool-rail={showToolRail}
  class:gg-with-legend-clear={interactionConfig.legendFocus !== null &&
    effectiveLegendPressed !== null}
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
      onChooseTool={chooseTool}
      onResetZoom={() => resetZoom("pointer")}
      onClearPointSelection={() => {
        if (canPublishPointSelection) clearPointSelection("pointer");
      }}
      onClearIntervalSelection={() => clearIntervalSelection("pointer")}
    />
  {/if}
  {#if model !== null}
    <PlotMarkStrata
      {model}
      {strata}
      {markLabel}
      {interactionMasks}
      {a11yTableOpen}
      onA11yToggle={() => (a11yTableOpen = !a11yTableOpen)}
      onPainted={notifyPainted}
    />
    <PlotLegendTargets
      entries={interactiveLegendEntries}
      previewIdentity={legendPreview?.action.identity ?? null}
      pressedIdentity={effectiveLegendPressed}
      rovingIndex={legendRovingIndex}
      sceneWidth={model.scene.width}
      sceneHeight={model.scene.height}
      clearLegendX={resolveClearLegendX({
        legendFocusEnabled: interactionConfig.legendFocus !== null,
        pressedScale: effectiveLegendPressed?.scale ?? null,
        legends: model.scene.legends,
      })}
      onPreviewIndex={(index) => previewLegendIndex(index, "pointer")}
      onPreviewClear={() => previewLegend(null)}
      onPointerDown={onLegendPointerDown}
      onPointerUp={onLegendPointerUp}
      onPointerCancel={() => (legendTouchIndex = -1)}
      onFocus={onLegendFocus}
      onBlur={onLegendBlur}
      onClick={onLegendClick}
      onKeyDown={onLegendKeydown}
      onClearPointerDown={(pointerType) =>
        (legendClearPointerType = pointerType)}
      onClearPointerCancel={() => (legendClearPointerType = null)}
      onClearClick={clearLegendFromControl}
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
      {committedInterval}
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
        {onDblClick}
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
      activeDatumLabel={datumLabel(inspection?.focus.row ?? null)}
      showAreaInstruction={surfaceInteractive && areaAwaitingSecond}
      showLiveRegion={shouldRenderInteractionLiveRegion({
        surfaceInteractive,
        legendFocusEnabled: interactionConfig.legendFocus !== null,
      })}
      liveText={resolveInteractionLiveText({
        announcement: interactionAnnouncement,
        model,
        inspection,
      })}
      {emptyPlot}
      {capabilityStatus}
    />
  {/if}
</div>

<style>
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
