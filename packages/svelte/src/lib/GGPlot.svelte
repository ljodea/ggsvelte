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
    GeometryBatch,
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
  import {
    buildHitIndex,
    cssColorResolver,
    drawStratum,
    sizeCanvasForDpr,
  } from "@ggsvelte/core/dom";

  import {
    INTERACTION_DIAGNOSTIC_CATALOG,
    normalizeInteractionConfig,
    type InspectInput,
    type InteractionDiagnostic,
    type InteractionSource,
    type InteractionTool,
    type IntervalSelection,
    type PlotInteractionInterval,
    type SemanticIntervalAxis,
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
  import {
    clearInspectionFingerprint,
    createInspectionCoordinator,
  } from "./inspection-resolver.js";
  import { createInteractionReducer } from "./interaction-reducer.js";
  import { provideRegistry } from "./registry.svelte.js";
  import { a11yRows } from "./canvas-a11y.js";
  import InteractionOverlay from "./InteractionOverlay.svelte";
  import {
    assemblePortableSpec,
    resolveInteractionScope,
    toLayerInput,
  } from "./plot-assemble.js";
  import {
    brushAtPoint,
    brushWithEnd,
    evaluatePointerBrushEnd,
    nudgeBrushEnd,
    panelCenterAnchor,
  } from "./plot-area-brush.js";
  import { frozenZoomDomains, normalizedRect } from "./plot-geometry.js";
  import { resolveSurfaceKeyAction } from "./plot-surface-keyboard.js";
  import { resolveQueuedInspectFrameAction } from "./plot-surface-inspection.js";
  import {
    resolveCaptureClickAction,
    advanceTouchInspectMoved,
    resolvePointerDownAction,
    resolvePointerMoveAction,
    resolvePointerUpAction,
  } from "./plot-surface-pointer.js";
  import {
    resolveLegendClickAction,
    resolveLegendKeyAction,
    resolveLegendPointerUpAction,
  } from "./plot-legend-surface.js";
  import {
    datumLabel as datumLabelFor,
    inspectionLiveText as inspectionLiveTextFor,
    markLabel as markLabelFor,
  } from "./plot-labels.js";
  import {
    bestDirectionalIndex,
    buildTraversalHits,
    cycleCoincidentIndex,
    hitFromCandidate,
    matchCandidateFromHit,
    nextTraversalIndex,
    plotPointFromClient,
  } from "./plot-pointer.js";
  import {
    bandChannelsForZoom,
    capabilityStatusText,
    filterAvailableTools,
    zoomScaleDiagnosticsFromChannels,
    zoomSupportsChannel,
  } from "./plot-capability.js";
  import {
    buildIntervalSelection,
    clearIntervalSelectionEvent,
  } from "./plot-interval.js";
  import {
    buildIntervalSelectionFromScene,
    type IntervalQueryScene,
  } from "./plot-interval-query.js";
  import {
    consumeIntervalKeys,
    recomputePanelIntervalKeys,
    type IntervalConsumptionCandidate,
  } from "./plot-interval-consumption.js";
  import { createPaintLedger, isPlotReady } from "./plot-paint.js";
  import BoundsEditor from "./BoundsEditor.svelte";
  import type {
    BoundsEditorInput,
    PreciseBoundsApplyEvent,
  } from "./bounds-editor.js";
  import {
    boundsEditorInputForScale,
    semanticAxisFromBounds,
  } from "./plot-precise-bounds.js";
  import { nextLocalIntervalRecords } from "./plot-interval-consumption.js";
  import {
    anchorsFromCandidateKeys,
    buildPointSelectionEvent,
    nextPointSelectionKeys,
    rowIndexesForCandidate,
    sameOrderedPropertyKeys,
    uniqueKeysFromRowIndexes,
  } from "./plot-selection.js";
  import {
    createSourceIdentityTracker,
    resolveSemanticKeys,
  } from "./plot-semantic-keys.js";
  import { themeTokensToCss } from "./plot-theme-css.js";
  import {
    applyZoomToSpec,
    buildZoomEvent,
    filterZoomDomainsByMode,
    resolveBrushZoomDomains,
    sanitizePartialZoomDomains,
    stableZoomDomains,
  } from "./plot-zoom.js";
  import {
    buildInteractiveLegendEntries,
    buildLegendEntryKeyIndex,
    clampLegendRovingIndex,
    findLegendPressedIdentity,
    keysForLegendEntry,
    legendInteractionSource,
    moveLegendRovingIndex,
    samePropertyKeySet,
    type LegendEntryAction,
    type LegendEntryIdentity,
  } from "./plot-legend-focus.js";
  import SceneView from "./SceneView.svelte";
  import Tooltip from "./Tooltip.svelte";
  import ToolRail from "./ToolRail.svelte";
  import {
    isLegendValueVisible,
    nextLegendFilterValues,
    type LegendFilterClause,
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

  const resolvedInteractionScope: PlotInteractionScope = $derived(
    resolveInteractionScope({
      interaction,
      ...(interactionScope !== undefined && { interactionScope }),
      zoom,
      faceted: assembled?.facet !== undefined,
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
        faceted: assembled?.facet !== undefined,
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
    assembled === null
      ? "no-data"
      : `${sourceIdentity(data)}:${sourceIdentity(spec)}:${JSON.stringify([
          assembled.data ?? null,
          assembled.datasets ?? null,
        ])}`,
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

  const resolvedWidth: number = $derived(
    width === undefined || width === "container"
      ? (containerWidth ?? assembled?.width ?? 640)
      : (width ?? assembled?.width ?? 640),
  );
  const resolvedHeight: number = $derived(height ?? assembled?.height ?? 400);

  // Authoritative committed scale state: a plain non-reactive box + run-id
  // gate. Committing only monotonically newer runs keeps stale results from
  // clobbering the value-stable color assignments. scaleEpoch exists so
  // resetScales() can force a re-run after clearing the box.
  const scaleBox: {
    runId: number;
    scales: Record<string, ScaleState> | undefined;
  } = { runId: -1, scales: undefined };
  let scaleEpoch = $state(0);

  const legendFilterOptions = $derived(
    legendFilter === false
      ? null
      : {
          mode:
            typeof legendFilter === "object"
              ? (legendFilter.mode ?? "exclude")
              : "exclude",
          multiple:
            typeof legendFilter === "object"
              ? (legendFilter.multiple ?? true)
              : true,
        },
  );
  let localLegendFilters = $state<LegendFilterClause[]>([]);
  const activeLegendFilterBindings = $derived.by(() => {
    const bindings = new Set<string>();
    if (effectiveSpec === null) return bindings;
    for (const layer of effectiveSpec.layers) {
      for (const scale of ["color", "fill"] as const) {
        const channel = layer.aes?.[scale] ?? effectiveSpec.aes?.[scale];
        if (channel != null && "field" in channel)
          bindings.add(`${scale}:${channel.field}`);
      }
    }
    return bindings;
  });
  const effectiveLegendFilters = $derived(
    legendFilterOptions === null
      ? []
      : localLegendFilters.filter((clause) =>
          activeLegendFilterBindings.has(`${clause.scale}:${clause.field}`),
        ),
  );

  // A disabled capability or a remapped spec must never leave an invisible
  // filter active. Reconcile chart-local state to the current semantic fields.
  $effect(() => {
    if (effectiveLegendFilters.length === localLegendFilters.length) return;
    localLegendFilters = [...effectiveLegendFilters];
  });

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
      ...(effectiveLegendFilters.length > 0 && {
        rowFilters: effectiveLegendFilters,
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
    else interaction.resetZoom({ scope: resolvedInteractionScope });
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

  // Redraw canvases when the host theme flips (canvas colors resolve from
  // computed style at draw time; SVG re-resolves via CSS automatically).
  let themeEpoch = $state(0);
  $effect(() => {
    if (!hasCanvas) return;
    const observer = new MutationObserver(() => {
      themeEpoch++;
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => observer.disconnect();
  });

  /** Svelte attachment: size for DPR, draw the stratum, signal first paint. */
  function canvasAttachment(
    m: RenderModel,
    batches: GeometryBatch[],
    stratumKey: string,
  ) {
    void themeEpoch;
    const focusMasks = masksForBatches(batches);
    return (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;
      const dpr = window.devicePixelRatio || 1;
      sizeCanvasForDpr(canvas, ctx, m.scene.width, m.scene.height, dpr);
      drawStratum(
        ctx,
        m.scene,
        batches,
        cssColorResolver(canvas),
        focusMasks.length > 0
          ? { focusMasks, mutedAlpha: m.scene.theme.interactionMuted }
          : undefined,
      );
      // untrack: the attachment must WRITE paint state without SUBSCRIBING
      // to it (a tracked read here would re-trigger the attachment -> loop).
      untrack(() => notifyPainted(m.runId, stratumKey));
    };
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
  type QueuedPointerInspection = {
    hit: SceneHit | null;
    source: InteractionSource;
    concreteMode?: "exact" | "x" | "y" | "xy";
    candidate?: CandidateFacts;
  };
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
    const anchor = inspection.focus.anchor;
    return (
      model.scene.panels.find(
        (panel) =>
          anchor.x >= panel.x &&
          anchor.x <= panel.x + panel.width &&
          anchor.y >= panel.y &&
          anchor.y <= panel.y + panel.height,
      ) ?? null
    );
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
    return reducer.state.area.kind !== "idle";
  });
  const areaAwaitingSecond = $derived.by(() => {
    void reducerRevision;
    return reducer.state.area.kind === "first-corner";
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
  let legendFilterPointerType: string | null = null;
  const effectiveSelectedKeys: readonly PropertyKey[] = $derived.by(() => {
    void controllerRevision;
    return interaction?.selected(resolvedInteractionScope) ?? localSelectedKeys;
  });
  const effectiveEmphasisKeys: readonly PropertyKey[] = $derived.by(() => {
    void controllerRevision;
    return (
      legendPreview?.keys ??
      interaction?.emphasized(resolvedInteractionScope) ??
      localEmphasisKeys
    );
  });
  let committedInterval = $state<IntervalSelection | null>(null);
  let localCommittedIntervals = $state<PlotInteractionInterval<PublicKey>[]>(
    [],
  );
  let boundsEditor = $state<{
    action: "select" | "zoom";
    axis: "x" | "y";
    panelId?: string;
  } | null>(null);
  let boundsReturnFocus = $state<HTMLElement | null>(null);
  const effectiveIntervals = $derived.by(() => {
    void controllerRevision;
    return (
      interaction?.intervals(resolvedInteractionScope) ??
      localCommittedIntervals
    );
  });
  function intervalConsumptionCandidates(): IntervalConsumptionCandidate<PublicKey>[] {
    if (model === null) return [];
    const candidates: IntervalConsumptionCandidate<PublicKey>[] = [];
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate === null) continue;
      candidates.push({
        panelId: candidate.panelId,
        xValue: candidate.xValue,
        yValue: candidate.yValue,
        keys: candidateSemanticKeys(candidate) as PublicKey[],
      });
    }
    return candidates;
  }
  const effectiveIntervalKeys: readonly PropertyKey[] = $derived.by(() => {
    if (model === null) return [];
    return consumeIntervalKeys({
      records: effectiveIntervals,
      panels: model.scene.panels,
      candidates: intervalConsumptionCandidates(),
    });
  });
  const currentIntervalRecord = $derived.by(() => {
    const panelId = committedInterval?.panelId;
    return (
      (panelId === null || panelId === undefined
        ? undefined
        : effectiveIntervals.find((record) => record.panelId === panelId)) ??
      effectiveIntervals[0] ??
      null
    );
  });
  const boundsEditorInput = $derived.by((): BoundsEditorInput | null => {
    if (boundsEditor === null || model === null) return null;
    if (boundsEditor.action === "zoom") {
      const scale = model.scales[boundsEditor.axis];
      if (scale.type === "band") return null;
      const bounds = effectiveZoomDomains?.[boundsEditor.axis] ?? scale.domain;
      return boundsEditorInputForScale({
        axis: boundsEditor.axis,
        action: "zoom",
        scale,
        bounds,
        reversed:
          scale.normalize(scale.domain[0]) > scale.normalize(scale.domain[1]),
      });
    }
    const record = currentIntervalRecord;
    const panelId = record?.panelId ?? boundsEditor.panelId;
    if (panelId === undefined) return null;
    const panelIndex = model.scene.panels.findIndex(
      (panel) => panel.id === panelId,
    );
    if (panelIndex < 0) return null;
    const scale =
      model.scales.panels[panelIndex]?.[boundsEditor.axis] ??
      model.scales[boundsEditor.axis];
    const semantic = record?.domains[boundsEditor.axis];
    const bounds =
      semantic?.kind === "band"
        ? ([semantic.values[0] ?? "", semantic.values.at(-1) ?? ""] as const)
        : semantic?.domain;
    return boundsEditorInputForScale({
      axis: boundsEditor.axis,
      action: "select",
      scale,
      ...(bounds !== undefined && { bounds }),
      reversed:
        scale.type !== "band" &&
        scale.normalize(scale.domain[0]) > scale.normalize(scale.domain[1]),
    });
  });
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
  const showToolRail = $derived(
    interactive &&
      (availableTools.length > 1 ||
        (canPublishPointSelection && effectiveSelectedKeys.length > 0) ||
        effectiveIntervals.length > 0 ||
        effectiveZoomDomains !== null),
  );
  const emptyPlot = $derived(
    model !== null &&
      model.scene.batches.every((batch) => batch.rowIndex.length === 0),
  );
  const preciseIntervalAxes = $derived.by((): readonly ("x" | "y")[] => {
    const select = interactionConfig.select;
    if (select === null || select.type !== "interval") return [];
    return (["x", "y"] as const).filter(
      (axis) => select.mode === "xy" || select.mode === axis,
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
    if (
      interactionConfig.legendFocus === null ||
      model === null ||
      model.scene.legends.length === 0 ||
      model.scene.legends.some((candidate) => candidate.type === "discrete")
    )
      return [] as InteractionDiagnostic[];
    return [
      {
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_LEGEND_DISCRETE_ONLY,
        actual: model.scene.legends.map((candidate) => candidate.type),
      },
    ];
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
    `${hasCanvas || interactive || effectiveEmphasisKeys.length > 0 || effectiveSelectedKeys.length > 0 ? `width:${width === undefined || width === "container" ? "100%" : `${model?.scene.width ?? resolvedWidth}px`};height:${model?.scene.height ?? resolvedHeight}px;` : ""}${themeStyle}` ||
      undefined,
  );
  function anchorsForKeys(keys: readonly PropertyKey[]): {
    x: number;
    y: number;
  }[] {
    if (model === null || keys.length === 0) return [];
    const candidates: {
      x: number;
      y: number;
      keys: readonly PropertyKey[];
    }[] = [];
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate === null) continue;
      candidates.push({
        x: candidate.x,
        y: candidate.y,
        keys: candidateSemanticKeys(candidate),
      });
    }
    return anchorsFromCandidateKeys(candidates, keys);
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

  function clearIntervalSelection(source: InteractionSource): void {
    const current = committedInterval;
    if (current === null && effectiveIntervals.length === 0) return;
    if (interaction === undefined) {
      localCommittedIntervals = [];
    } else {
      interaction.clearIntervals({ scope: resolvedInteractionScope, source });
    }
    const event = clearIntervalSelectionEvent(
      current ?? {
        mode: interactionConfig.select?.mode ?? "xy",
        panelId: null,
        pixels: { x0: 0, y0: 0, x1: 0, y1: 0 },
      },
      source,
    );
    committedInterval = null;
    emitSelection(event);
  }

  function clearCurrentPanelInterval(source: InteractionSource): void {
    const panelId =
      committedInterval?.panelId ?? currentIntervalRecord?.panelId;
    if (panelId === null || panelId === undefined) return;
    if (interaction === undefined) {
      localCommittedIntervals = localCommittedIntervals.filter(
        (interval) => interval.panelId !== panelId,
      );
    } else {
      interaction.clearInterval(panelId, {
        scope: resolvedInteractionScope,
        source,
      });
    }
    const event = clearIntervalSelectionEvent(
      committedInterval ?? {
        mode: interactionConfig.select?.mode ?? "xy",
        panelId,
        pixels: { x0: 0, y0: 0, x1: 0, y1: 0 },
      },
      source,
    );
    committedInterval = null;
    emitSelection(event);
  }

  function semanticAxis(
    panelIndex: number,
    axis: "x" | "y",
    bounds: readonly [CellValue, CellValue] | undefined,
  ): SemanticIntervalAxis | undefined {
    if (bounds === undefined || model === null) return undefined;
    const scale = model.scales.panels[panelIndex]?.[axis] ?? model.scales[axis];
    if (scale.type === "band") {
      const first = scale.domain.indexOf(String(bounds[0]));
      const last = scale.domain.indexOf(String(bounds[1]));
      if (first < 0 || last < 0) return undefined;
      return semanticAxisFromBounds("band", [
        scale.domain[Math.min(first, last)]!,
        scale.domain[Math.max(first, last)]!,
      ]);
    }
    return semanticAxisFromBounds(scale.type, [
      Number(bounds[0]),
      Number(bounds[1]),
    ]);
  }

  function commitIntervalSelection(
    event: IntervalSelection,
    source: InteractionSource,
  ): void {
    const panelId = event.panelId;
    if (panelId === null || model === null) return;
    const panelIndex = model.scene.panels.findIndex(
      (panel) => panel.id === panelId,
    );
    if (panelIndex < 0) return;
    const x = semanticAxis(panelIndex, "x", event.domain.x);
    const y = semanticAxis(panelIndex, "y", event.domain.y);
    const record: PlotInteractionInterval<PublicKey> = Object.freeze({
      panelId,
      preset: interactionConfig.select?.preset ?? "independent",
      domains: Object.freeze({
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      }),
      keys: Object.freeze([...event.keys]) as readonly PublicKey[],
    });
    if (interaction === undefined) {
      localCommittedIntervals = [
        ...nextLocalIntervalRecords(localCommittedIntervals, record),
      ];
    } else {
      interaction.setInterval(record, {
        scope: resolvedInteractionScope,
        source,
      });
    }
  }

  function emitSelection(event: PlotSelection): void {
    if (event.phase === "end") {
      const count =
        event.mode === "point" ? event.keys.length : event.lineageCount;
      announceInteraction(
        `Selection complete, ${String(count)} ${count === 1 ? "datum" : "data"}.`,
      );
    } else if (event.phase === "clear") {
      announceInteraction("Selection cleared.");
    }
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

  const semanticKeys = $derived.by(() => {
    if (model === null)
      return {
        keys: new Map<number, PropertyKey | null>(),
        diagnostics: [] as InteractionDiagnostic[],
      };
    return resolveSemanticKeys({
      model: {
        candidateCount: model.candidates.size,
        candidate: (id) => model.candidates.candidate(id),
        lineageKeys: (lineageId) => model.lineage.keys(lineageId),
        row: (rowIndex) => model.row(rowIndex),
        layers: assembled?.layers ?? [],
      },
      datumKey: datumKey as
        string | ((row: never, index: number) => PropertyKey) | undefined,
      priorKeys,
      rowIdentity: (rowIndex) =>
        `${sourceIdentity(data)}:${sourceIdentity(spec)}:${rowIndex}`,
    });
  });

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
        inspection?.state !== "pinned" ||
        root?.contains(event.target as Node)
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
    const requested = tool ?? interactionConfig.initialTool;
    const next = availableTools.includes(requested)
      ? requested
      : (availableTools[0] ?? "inspect");
    reducer.dispatch({ type: "set-tool", tool: next });
  });

  function chooseTool(next: InteractionTool): void {
    if (!availableTools.includes(next)) return;
    if (tool !== undefined) {
      ontoolchange?.(next);
      return;
    }
    reducer.dispatch({ type: "set-tool", tool: next });
    brushRect = null;
    queuedPointerInspection = null;
    reducer.cancelScheduledPointer();
    ontoolchange?.(next);
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
    $derived.by(() => {
      if (model === null) return new Map<string, readonly PropertyKey[]>();
      const current = model;
      return buildLegendEntryKeyIndex({
        legends: current.scene.legends,
        candidates: function* () {
          for (let id = 0; id < current.candidates.size; id++) {
            const candidate = current.candidates.candidate(id);
            if (candidate === null) continue;
            yield {
              layerIndex: candidate.layerIndex,
              lineage: candidate.lineage,
              rowIndex: candidate.rowIndex,
            };
          }
        },
        layerFields: (layerIndex) => current.layerFields[layerIndex],
        lineageKeys: (lineageId) => current.lineage.keys(lineageId),
        row: (rowIndex) => current.row(rowIndex),
        semanticKey: (rowIndex) => semanticKeys.keys.get(rowIndex),
      });
    });

  function keysForLegend(action: LegendEntryAction): readonly PropertyKey[] {
    return keysForLegendEntry(legendEntryKeyIndex, action.identity);
  }

  function emitLegendFocus(event: LegendFocusEvent<PropertyKey>): void {
    if (event.phase === "change") {
      announceInteraction(
        `${event.label} ${event.state === "committed" ? "focused" : "previewed"}, ${String(event.keys.length)} ${event.keys.length === 1 ? "datum" : "data"}.`,
      );
    } else {
      announceInteraction("Legend focus cleared.");
    }
    onlegendfocus?.(event as LegendFocusEvent<PublicKey>);
    oninteraction?.(event as PlotInteractionEvent<Row, PublicKey>);
  }

  function previewLegend(action: LegendEntryAction | null): void {
    if (action === null) {
      if (legendPreview === null) return;
      const source = legendInteractionSource(legendPreview.action.source);
      legendPreview = null;
      const committed =
        interaction?.emphasized(resolvedInteractionScope) ?? localEmphasisKeys;
      if (committed.length === 0)
        emitLegendFocus({ type: "legend-focus", phase: "clear", source });
      return;
    }
    const keys = keysForLegend(action);
    if (keys.length === 0) return;
    legendPreview = { action, keys };
    emitLegendFocus({
      type: "legend-focus",
      phase: "change",
      state: "transient",
      source: legendInteractionSource(action.source),
      scale: action.identity.scale as "color" | "fill",
      value: action.entry.value as CellValue,
      label: action.entry.label,
      keys,
    });
  }

  function clearLegendFocus(source: InteractionSource): void {
    const hadFocus =
      legendPreview !== null ||
      legendCommitted !== null ||
      effectiveEmphasisKeys.length > 0;
    legendPreview = null;
    legendCommitted = null;
    if (interaction === undefined) localEmphasisKeys = [];
    else interaction.clearEmphasis({ scope: resolvedInteractionScope, source });
    if (hadFocus)
      emitLegendFocus({ type: "legend-focus", phase: "clear", source });
  }

  function clearLegendFromControl(event: MouseEvent): void {
    const returnTarget = root?.querySelector<HTMLElement>(
      ".gg-legend-target[aria-pressed='true']",
    );
    const source: InteractionSource =
      event.detail === 0
        ? "keyboard"
        : legendClearPointerType === "touch"
          ? "touch"
          : "pointer";
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
    const source = legendInteractionSource(action.source);
    if (
      effectiveLegendPressed?.scale === action.identity.scale &&
      effectiveLegendPressed.entryIndex === action.identity.entryIndex
    ) {
      clearLegendFocus(source);
      return;
    }
    const keys = keysForLegend(action);
    if (keys.length === 0) return;
    legendPreview = null;
    legendCommitted = { identity: action.identity, keys };
    if (interaction === undefined) localEmphasisKeys = [...keys];
    else
      interaction.setEmphasis(keys as readonly PublicKey[], {
        scope: resolvedInteractionScope,
        source,
      });
    emitLegendFocus({
      type: "legend-focus",
      phase: "change",
      state: "committed",
      source,
      scale: action.identity.scale as "color" | "fill",
      value: action.entry.value as CellValue,
      label: action.entry.label,
      keys,
    });
  }

  const presentationFocusKeys: readonly PropertyKey[] = $derived.by(() => {
    if (effectiveEmphasisKeys.length === 0 || inspection === null)
      return effectiveEmphasisKeys;
    return Object.freeze([
      ...new Set([
        ...effectiveEmphasisKeys,
        ...inspection.focus.sourceKeys,
        ...(inspection.focus.key === null ? [] : [inspection.focus.key]),
      ]),
    ]);
  });

  const semanticCandidateProjections = $derived.by(() => {
    if (model === null) return [];
    const candidates = [];
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate === null) continue;
      candidates.push({
        batchIndex: candidate.batchIndex,
        primitiveIndex: candidate.primitiveIndex,
        keys: candidateSemanticKeys(candidate),
      });
    }
    return candidates;
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

  function masksForBatches(batches: readonly GeometryBatch[]) {
    if (model === null || interactionMasks.length === 0) return [];
    return batches.map((batch) => {
      const index = model.scene.batches.indexOf(batch);
      return index < 0 ? null : (interactionMasks[index] ?? null);
    });
  }

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

  const filterableLegendEntries = $derived.by(() => {
    if (model === null || legendFilterOptions === null) return [];
    return model.scene.legends.flatMap((sceneLegend) => {
      if (sceneLegend.type !== "discrete") return [];
      if (sceneLegend.scale !== "color" && sceneLegend.scale !== "fill")
        return [];
      const fields = new Set(
        model.layerFields
          .flatMap((mappedFields) => mappedFields)
          .filter(
            (mapped) =>
              mapped.channel === sceneLegend.scale && mapped.source !== "stat",
          )
          .map((mapped) => mapped.field),
      );
      const field = fields.values().next().value as string | undefined;
      // One combined scale fed by unlike fields has no honest one-toggle
      // filtering semantics. Keep the static legend rather than filtering
      // only whichever field happened to be encountered first.
      if (field === undefined || fields.size !== 1) return [];
      const current = localLegendFilters.find(
        (clause) =>
          clause.scale === sceneLegend.scale && clause.field === field,
      );
      return sceneLegend.entries.map((entry) => ({
        legend: sceneLegend,
        entry,
        field,
        visible:
          current === undefined ||
          isLegendValueVisible(
            current.values,
            entry.value as CellValue,
            current.mode,
          ),
      }));
    });
  });

  function legendFilterSource(event: MouseEvent): LegendFilterEvent["source"] {
    if (event.detail === 0) return "keyboard";
    return legendFilterPointerType === "touch" ? "touch" : "pointer";
  }

  function toggleLegendFilter(
    target: (typeof filterableLegendEntries)[number],
    event: MouseEvent,
  ): void {
    if (legendFilterOptions === null) return;
    // This is a controlled checkbox. Prevent the browser's post-handler
    // default toggle from racing the reactive checked value.
    event.preventDefault();
    const catalog = target.legend.entries.map(
      (entry) => entry.value as CellValue,
    );
    const index = localLegendFilters.findIndex(
      (clause) =>
        clause.scale === target.legend.scale && clause.field === target.field,
    );
    const current = localLegendFilters[index];
    const baseline =
      current?.values ??
      (legendFilterOptions.mode === "include" ? catalog : []);
    const values = nextLegendFilterValues(
      baseline,
      target.entry.value as CellValue,
      catalog,
      legendFilterOptions.mode,
      legendFilterOptions.multiple,
    );
    const clause: LegendFilterClause = Object.freeze({
      scale: target.legend.scale as "color" | "fill",
      field: target.field,
      values,
      mode: legendFilterOptions.mode,
    });
    localLegendFilters =
      index < 0
        ? [...localLegendFilters, clause]
        : localLegendFilters.map((candidate, candidateIndex) =>
            candidateIndex === index ? clause : candidate,
          );
    const source = legendFilterSource(event);
    legendFilterPointerType = null;
    const filterEvent: LegendFilterEvent = Object.freeze({
      type: "legend-filter",
      phase: "change",
      source,
      clause,
    });
    onlegendfilter?.(filterEvent);
    announceInteraction(
      `${target.entry.label} ${isLegendValueVisible(values, target.entry.value as CellValue, legendFilterOptions.mode) ? "shown" : "hidden"}.`,
    );
  }

  function resetLegendFilters(event: MouseEvent): void {
    if (localLegendFilters.length === 0) return;
    const returnTarget = root?.querySelector<HTMLElement>(
      ".gg-legend-filters input",
    );
    const source = legendFilterSource(event);
    localLegendFilters = [];
    legendFilterPointerType = null;
    onlegendfilter?.(
      Object.freeze({
        type: "legend-filter",
        phase: "clear",
        source,
        clause: null,
      }),
    );
    announceInteraction("Legend filters reset.");
    queueMicrotask(() => returnTarget?.focus());
  }

  $effect.pre(() => {
    const count = interactiveLegendEntries.length;
    const nextIndex = clampLegendRovingIndex(legendRovingIndex, count);
    const active = document.activeElement;
    const focusedIndex =
      active instanceof HTMLElement &&
      active.matches("[data-gg-legend-target]") &&
      root?.contains(active)
        ? Number(active.dataset["index"])
        : null;
    if (nextIndex !== legendRovingIndex) legendRovingIndex = nextIndex;
    if (focusedIndex === null || count === 0) return;
    const returnIndex = clampLegendRovingIndex(focusedIndex, count);
    queueMicrotask(() => {
      root
        ?.querySelector<HTMLElement>(
          `[data-gg-legend-target][data-index="${String(returnIndex)}"]`,
        )
        ?.focus();
    });
  });

  $effect(() => {
    const committed = legendCommitted;
    if (committed === null) return;
    const current = interactiveLegendEntries.find(
      ({ identity }) =>
        identity.scale === committed.identity.scale &&
        identity.entryIndex === committed.identity.entryIndex,
    );
    const currentKeys =
      current === undefined
        ? []
        : keysForLegendEntry(legendEntryKeyIndex, current.identity);
    if (samePropertyKeySet(currentKeys, committed.keys)) return;

    legendCommitted = null;
    if (interaction === undefined && localEmphasisKeys.length > 0) {
      localEmphasisKeys = [];
      emitLegendFocus({
        type: "legend-focus",
        phase: "clear",
        source: "programmatic",
      });
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
      event.relatedTarget instanceof Element &&
      event.relatedTarget.matches("[data-gg-legend-target]")
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
    return matchCandidateFromHit(
      (function* () {
        for (let id = 0; id < model.candidates.size; id++) {
          const candidate = model.candidates.candidate(id);
          if (candidate !== null) yield candidate;
        }
      })(),
      hit,
    );
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
    const mode =
      concreteMode ?? (requested === "auto" ? seed.autoMode : requested);
    return inspectionCoordinator.resolve({
      model,
      seed,
      mode,
      state,
      source,
      identityEpoch: dataIdentityEpoch,
      layoutEpoch: model.runId,
      completeness:
        state === "pinned" ||
        interactionConfig.inspect?.content !== undefined ||
        oninspect !== undefined ||
        oninteraction !== undefined
          ? "complete"
          : "transient",
    });
  }

  const traversalHits: SceneHit[] = $derived.by(() => {
    if (!surfaceInteractive || model === null) return [];
    return buildTraversalHits(model.candidates);
  });
  let reconciledRun = -1;
  $effect(() => {
    const currentModel = model;
    const inspectionEnabled = interactionConfig.inspect !== null;
    if (!inspectionEnabled) {
      if (inspection !== null) {
        inspectionCoordinator.invalidate();
        inspection = null;
        inspectionSeed = null;
        reducer.dispatch({
          type: "inspect",
          candidate: null,
          source: "programmatic",
        });
      }
      return;
    }
    if (currentModel === null || currentModel.runId === reconciledRun) return;
    reducer.dispatch({ type: "invalidate", reason: "scene" });
    queuedPointerInspection = null;
    pendingPinnedPointer = null;
    queuedPointerToken = null;
    reducer.cancelScheduledPointer();
    reconciledRun = currentModel.runId;
    if (inspection?.state === "transient") {
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
    if (inspection?.state !== "pinned") return;
    const reconciled = inspectionCoordinator.reconcilePinned({
      model: currentModel,
      identityEpoch: dataIdentityEpoch,
      layoutEpoch: currentModel.runId,
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
  });

  function emitInspection(
    next: PlotInspection<Record<string, CellValue>>,
    semanticFingerprint?: string,
  ): void {
    // Clear tokens come from the inspection-resolver helper. Non-clear
    // emissions must carry the coordinator's type-aware semanticFingerprint —
    // never a host-side String(key) fallback (collides symbols / delimiters).
    const fingerprint =
      next.phase === "clear"
        ? clearInspectionFingerprint(next.source)
        : semanticFingerprint;
    if (fingerprint !== undefined) {
      if (fingerprint === lastInspectionFingerprint) return;
      lastInspectionFingerprint = fingerprint;
    }
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
    if (hit !== null && (source === "keyboard" || source === "touch"))
      interactionAnnouncement = "";
    if (inspection?.state === "pinned" && state === "transient") return;
    if (hit === null) {
      if (tooltipHovered || inspection?.state === "pinned") return;
      reducer.dispatch({ type: "inspect", candidate: null, source });
      if (inspection !== null)
        emitInspection({ type: "inspect", phase: "clear", source });
      inspection = null;
      inspectionSeed = null;
      inspectionCoordinator.release("transient");
      reducer.dispatch({ type: "inspect", candidate: null, source });
      return;
    }
    const resolved = resolveInspection(
      hit,
      source,
      state,
      concreteMode,
      candidate,
    );
    if (resolved === null) {
      setInspection(null, source);
      return;
    }
    const next = resolved.snapshot;
    const candidateRef = {
      epoch: model?.runId ?? 0,
      id: candidate?.id ?? traversalHits.indexOf(hit),
      panelId: next.panelId,
      x: hit.x,
      y: hit.y,
    };
    reducer.dispatch({ type: "inspect", candidate: candidateRef, source });
    if (state === "pinned") reducer.dispatch({ type: "toggle-pin", source });
    if (
      (state === "transient" &&
        reducer.state.inspection.kind !== "transient") ||
      (state === "pinned" && reducer.state.inspection.kind !== "pinned")
    )
      return;
    inspection = next;
    inspectionSeed = resolved.seed;
    if (resolved.semanticChanged)
      emitInspection(next, resolved.semanticFingerprint);
  }

  function toggleInspectionPin(source: InteractionSource): void {
    if (inspection === null || inspectionSeed === null) return;
    reducer.dispatch({ type: "toggle-pin", source });
    if (inspection.state === "pinned" && pendingPinnedPointer !== null) {
      const pending = pendingPinnedPointer;
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
    const state = inspection.state === "pinned" ? "transient" : "pinned";
    const resolved = resolveInspection(
      hitFromCandidate(inspectionSeed),
      source,
      state,
      inspection.mode,
      inspectionSeed,
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
    if (state === "transient" && (source === "keyboard" || source === "touch"))
      announceInteraction(`${inspectionLiveText(resolved.snapshot)}, unpinned`);
    if (resolved.semanticChanged)
      emitInspection(resolved.snapshot, resolved.semanticFingerprint);
    if (
      state === "pinned" &&
      interactionConfig.inspect?.contentMode === "interactive"
    )
      queueMicrotask(() =>
        root
          ?.querySelector<HTMLElement>(`#${CSS.escape(plotId)}-tooltip`)
          ?.focus(),
      );
  }

  function closeInspection(
    source: InteractionSource,
    restoreFocus = true,
  ): void {
    reducer.dispatch({ type: "escape", source });
    if (inspection !== null)
      emitInspection({ type: "inspect", phase: "clear", source });
    inspection = null;
    inspectionSeed = null;
    tooltipHovered = false;
    pendingPinnedPointer = null;
    inspectionCoordinator.release("pinned");
    if (restoreFocus) queueMicrotask(() => captureSurface?.focus());
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
        const resolvedHit =
          match === null
            ? (hitIndex?.hitTest(p.x, p.y) ?? null)
            : hitFromCandidate(match);
        queuedPointerInspection = {
          hit: resolvedHit,
          source: action.source,
          ...(match !== null && {
            concreteMode: match.mode,
            candidate: match,
          }),
        };
        queuedPointerToken = reducer.frameToken();
        reducer.queuePointer({
          type: "inspect",
          candidate:
            match === null
              ? null
              : {
                  epoch: model?.runId ?? 0,
                  id: match.id,
                  panelId: panelId(match.panelIndex),
                  x: match.x,
                  y: match.y,
                },
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
    const current = model;
    if (current === null) return null;
    const panel = current.scene.panels[0];
    return {
      panel:
        panel === undefined
          ? null
          : {
              x: panel.x,
              y: panel.y,
              width: panel.width,
              height: panel.height,
              id: panel.id,
            },
      singlePanel: current.scene.panels.length === 1,
      flip: assembled?.coord?.type === "flip",
      scales: current.scales,
      panels: current.scene.panels.map((scenePanel, index) => ({
        x: scenePanel.x,
        y: scenePanel.y,
        width: scenePanel.width,
        height: scenePanel.height,
        id: scenePanel.id,
        scales: current.scales.panels[index] ?? current.scales,
      })),
      queryCandidates(expanded, requestedPanelId) {
        const requestedPanelIndex =
          requestedPanelId === undefined || requestedPanelId === null
            ? -1
            : current.scene.panels.findIndex(
                (candidate) => candidate.id === requestedPanelId,
              );
        return [
          ...current.candidates.queryRect(
            expanded.x0,
            expanded.y0,
            expanded.x1,
            expanded.y1,
          ),
        ]
          .map((id) => current.candidates.candidate(id))
          .filter(
            (candidate): candidate is CandidateFacts =>
              candidate !== null &&
              (requestedPanelIndex < 0 ||
                candidate.panelIndex === requestedPanelIndex),
          );
      },
      lineageKeys(lineageId) {
        return current.lineage.keys(lineageId);
      },
    };
  }

  function onPointerLeave(): void {
    queueMicrotask(() => {
      if (!brushing && !tooltipHovered) {
        queuedPointerInspection = null;
        pendingPinnedPointer = null;
        reducer.cancelScheduledPointer();
        setInspection(null, "pointer");
      }
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
        const area = reducer.state.area;
        const originPanel = action.extendExisting
          ? area.kind === "idle"
            ? null
            : (model?.scene.panels.find((panel) => panel.id === area.panelId) ??
              null)
          : panelAtPoint(p);
        if (originPanel === null) break;
        brushRect =
          action.extendExisting && brushRect !== null
            ? brushWithEnd(brushRect, p)
            : brushAtPoint(p);
        setInspection(
          null,
          event.pointerType === "touch" ? "touch" : "pointer",
        );
        reducer.dispatch({
          type: "begin-area",
          point: p,
          panelId: originPanel.id,
        });
        if (activeTool === "select-area" && !areaAwaitingSecond) {
          const startEvent = selectionEvent(
            "start",
            normalizedRect(brushRect),
            event.pointerType === "touch" ? "touch" : "pointer",
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
            action.pin ? "pinned" : "transient",
            match.mode,
            match,
          );
          suppressClickUntil = performance.now() + 500;
        }
        break;
      }
      case "none":
        break;
      case "finish-brush": {
        if (brushRect === null) break;
        reducer.cancelScheduledPointer();
        const source = event.pointerType === "touch" ? "touch" : "pointer";
        const ended = evaluatePointerBrushEnd(brushRect, plotPoint(event));
        if (ended.kind === "too-small") {
          brushRect = ended.corners;
          announceInteraction("Choose opposite corner.");
          break;
        }
        brushRect = null;
        if (activeTool === "select-area") {
          const eventValue = selectionEvent("end", ended.rect, source);
          committedInterval = interactionConfig.select?.persistent
            ? eventValue
            : null;
          if (interactionConfig.select?.persistent)
            commitIntervalSelection(eventValue, source);
          emitSelection(eventValue);
        } else if (activeTool === "zoom-area") {
          applyBrushZoom(ended.rect, source);
        }
        reducer.dispatch({ type: "cancel-area" });
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
      const transition =
        domains === null
          ? interaction.resetZoom({ scope: resolvedInteractionScope, source })
          : interaction.setZoom(domains, {
              scope: resolvedInteractionScope,
              source,
            });
      if (transition === null) return;
      if (domains !== null) {
        const x = transition.snapshot.zoom.x.find(
          (domain) => domain.scope === resolvedInteractionScope.x,
        )?.domain;
        const y = transition.snapshot.zoom.y.find(
          (domain) => domain.scope === resolvedInteractionScope.y,
        )?.domain;
        committed = frozenZoomDomains({
          ...(x !== undefined && { x: [...x] }),
          ...(y !== undefined && { y: [...y] }),
        });
      }
    }
    const event = buildZoomEvent(committed, source);
    announceInteraction(committed === null ? "Zoom reset." : "Zoom complete.");
    onzoom?.(event);
    oninteraction?.(event);
  }

  function openBoundsEditor(
    action: "select" | "zoom",
    axis: "x" | "y",
    trigger: HTMLElement,
  ): void {
    boundsReturnFocus = trigger;
    if (action === "select") {
      const panel =
        (currentIntervalRecord === null
          ? inspectionPanel
          : model?.scene.panels.find(
              (candidate) => candidate.id === currentIntervalRecord.panelId,
            )) ?? model?.scene.panels[0];
      if (panel === undefined) return;
      boundsEditor = { action, axis, panelId: panel.id };
      return;
    }
    boundsEditor = { action, axis };
  }

  function applyPreciseBounds(event: PreciseBoundsApplyEvent): void {
    if (event.action === "zoom") {
      if (event.scale === "band") return;
      commitZoom(
        frozenZoomDomains({
          ...(effectiveZoomDomains ?? {}),
          [event.axis]: [...event.bounds],
        }),
        event.inputSource,
      );
      boundsEditor = null;
      return;
    }
    const prior = currentIntervalRecord;
    const panelId = prior?.panelId ?? boundsEditor?.panelId;
    if (panelId === null || panelId === undefined || model === null) return;
    const axis = semanticAxisFromBounds(event.scale, event.bounds);
    const domains = Object.freeze({
      ...(prior?.domains ?? {}),
      [event.axis]: axis,
    });
    const keys = recomputePanelIntervalKeys({
      panelId,
      domains,
      candidates: intervalConsumptionCandidates(),
    }) as readonly PublicKey[];
    const next: PlotInteractionInterval<PublicKey> = Object.freeze({
      panelId,
      preset:
        prior?.preset ?? interactionConfig.select?.preset ?? "independent",
      domains,
      keys,
    });
    if (interaction === undefined) {
      localCommittedIntervals = [
        ...nextLocalIntervalRecords(localCommittedIntervals, next),
      ];
    } else {
      interaction.setInterval(next, {
        scope: resolvedInteractionScope,
        source: event.inputSource,
      });
    }
    const rawBounds = Object.freeze([...event.bounds]) as readonly [
      CellValue,
      CellValue,
    ];
    const panel = model.scene.panels.find(
      (candidate) => candidate.id === panelId,
    );
    if (panel === undefined) return;
    committedInterval = buildIntervalSelection({
      phase: "end",
      mode: interactionConfig.select?.mode ?? "xy",
      panelId,
      domain: {
        ...(committedInterval?.domain ?? {}),
        [event.axis]: rawBounds,
      },
      pixels:
        committedInterval?.panelId === panelId
          ? committedInterval.pixels
          : {
              x0: panel.x,
              y0: panel.y,
              x1: panel.x + panel.width,
              y1: panel.y + panel.height,
            },
      keys,
      lineageCount: keys.length,
      source: event.inputSource,
    });
    emitSelection(committedInterval);
    boundsEditor = null;
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

  function navigate(delta: number): void {
    if (traversalHits.length === 0) return;
    activeTraversalIndex = nextTraversalIndex(
      activeTraversalIndex,
      delta,
      traversalHits.length,
    );
    setInspection(traversalHits[activeTraversalIndex]!, "keyboard");
  }

  function navigateDirection(dx: number, dy: number): void {
    if (traversalHits.length === 0) return;
    if (inspection === null) {
      navigate(1);
      return;
    }
    const bestIndex = bestDirectionalIndex(
      inspection.focus.anchor,
      traversalHits,
      dx,
      dy,
    );
    if (bestIndex < 0) return;
    activeTraversalIndex = bestIndex;
    setInspection(traversalHits[bestIndex]!, "keyboard");
  }

  function cycleCoincident(delta: number): void {
    if (inspection === null) {
      navigate(1);
      return;
    }
    const nextIndex = cycleCoincidentIndex(
      inspection.focus.anchor,
      traversalHits,
      activeTraversalIndex,
      delta,
    );
    if (nextIndex < 0) return;
    activeTraversalIndex = nextIndex;
    setInspection(traversalHits[nextIndex]!, "keyboard");
  }

  function onSurfaceBlur(event: FocusEvent): void {
    if (root?.contains(event.relatedTarget as Node | null)) return;
    activeTraversalIndex = -1;
    reducer.dispatch({ type: "set-active", candidate: null });
    if (inspection?.state !== "pinned") setInspection(null, "keyboard");
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
        const originPanel = panelAtPoint(anchor);
        if (originPanel === null) return;
        brushRect = brushAtPoint(anchor);
        reducer.dispatch({
          type: "begin-area",
          point: anchor,
          panelId: originPanel.id,
        });
        announceInteraction("Choose opposite corner.");
        return;
      }
      case "complete-area": {
        if (brushRect === null) return;
        const rect = normalizedRect(brushRect);
        brushRect = null;
        if (activeTool === "select-area") {
          const selection = selectionEvent("end", rect, "keyboard");
          committedInterval = interactionConfig.select?.persistent
            ? selection
            : null;
          if (interactionConfig.select?.persistent)
            commitIntervalSelection(selection, "keyboard");
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
      case "toggle-point-keys": {
        if (inspection === null) return;
        togglePointKeys(
          inspection.focus.key === null
            ? inspection.focus.sourceKeys
            : [inspection.focus.key],
          "keyboard",
        );
        return;
      }
      case "toggle-pin":
        toggleInspectionPin("keyboard");
        return;
      case "escape": {
        reducer.dispatch({ type: "escape", source: "keyboard" });
        if (inspection !== null)
          emitInspection({
            type: "inspect",
            phase: "clear",
            source: "keyboard",
          });
        inspection = null;
        inspectionSeed = null;
        tooltipHovered = false;
        inspectionCoordinator.invalidate();
        brushRect = null;
        if (action.returnToInspect) chooseTool("inspect");
        break;
      }
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
          maxDistance: 24,
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
  class:gg-with-legend-filters={filterableLegendEntries.length > 0}
  class:gg-narrow-tools={resolvedWidth < 560}
  class:gg-with-docked-tooltip={inspection?.state === "pinned" &&
    resolvedWidth < 480}
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
      narrow={resolvedWidth < 560}
      zoomDomains={effectiveZoomDomains}
      hasPointSelection={canPublishPointSelection &&
        effectiveSelectedKeys.length > 0}
      hasIntervalSelection={effectiveIntervals.length > 0}
      canSetIntervalBounds={!emptyPlot && preciseIntervalAxes.length > 0}
      canSetZoomBounds={!emptyPlot && preciseZoomAxes.length > 0}
      intervalAxes={preciseIntervalAxes}
      zoomAxes={preciseZoomAxes}
      onChooseTool={chooseTool}
      onResetZoom={resetZoom}
      onClearPointSelection={clearPointSelection}
      onClearIntervalSelection={clearIntervalSelection}
      onClearCurrentInterval={clearCurrentPanelInterval}
      onEditBounds={openBoundsEditor}
    />
  {/if}
  {#if boundsEditorInput !== null}
    <div class="gg-precise-bounds">
      <BoundsEditor
        input={boundsEditorInput}
        returnFocus={boundsReturnFocus}
        onapply={applyPreciseBounds}
        oncancel={() => (boundsEditor = null)}
      />
    </div>
  {/if}
  {#if model !== null}
    {#if hasCanvas}
      <SceneView scene={model.scene} mode="chrome-bottom" />
      {#each strata as stratum, si (si)}
        {#if stratum.backend === "canvas"}
          <canvas
            class="gg-stratum gg-canvas"
            {@attach canvasAttachment(model, stratum.batches, `canvas:${si}`)}
          ></canvas>
          {@const table = a11yRows(model, stratum.batches)}
          <div
            class="gg-canvas-a11y"
            role="img"
            aria-label={`${sceneLabel(model.scene)} — ${String(table.total)} canvas-rendered marks. Canvas marks are not individually focusable; use the data table.`}
          ></div>
          <button
            type="button"
            class="gg-a11y-toggle"
            aria-expanded={a11yTableOpen}
            onclick={() => (a11yTableOpen = !a11yTableOpen)}
            >{a11yTableOpen ? "Hide data table" : "Show data table"}</button
          >
          {#if a11yTableOpen}
            <div class="gg-a11y-table">
              <table>
                <thead>
                  <tr>
                    {#each table.fields as field (field)}<th>{field}</th>{/each}
                  </tr>
                </thead>
                <tbody>
                  {#each table.rows as row, ri (ri)}
                    <tr>
                      {#each row as cell, ci (ci)}<td>{cell}</td>{/each}
                    </tr>
                  {/each}
                </tbody>
              </table>
              {#if table.total > table.rows.length}
                <p>First {table.rows.length} of {table.total} rows.</p>
              {/if}
            </div>
          {/if}
        {:else}
          <SceneView
            scene={model.scene}
            mode="marks"
            batches={stratum.batches}
            focusable={false}
            {markLabel}
            focusMasks={interactionMasks}
          />
        {/if}
      {/each}
      <SceneView scene={model.scene} mode="chrome-top" />
    {:else}
      <SceneView
        scene={model.scene}
        focusable={false}
        {markLabel}
        focusMasks={interactionMasks}
      />
    {/if}
    {#if interactiveLegendEntries.length > 0}
      <div
        class="gg-legend-targets"
        role="group"
        aria-label="Interactive legends"
      >
        {#each interactiveLegendEntries as target, index (`${target.identity.scale}:${target.identity.entryIndex}`)}
          <button
            type="button"
            class="gg-legend-target"
            class:gg-legend-target-active={legendPreview?.action.identity
              .scale === target.identity.scale &&
              legendPreview?.action.identity.entryIndex ===
                target.identity.entryIndex}
            aria-label={`${target.legend.title || target.identity.scale}: ${target.entry.label} (${target.identity.scale} legend)`}
            aria-pressed={effectiveLegendPressed?.scale ===
              target.identity.scale &&
              effectiveLegendPressed.entryIndex === target.identity.entryIndex}
            tabindex={index === legendRovingIndex ? 0 : -1}
            data-gg-legend-target
            data-index={index}
            style:left={`${target.legend.x}px`}
            style:top={`${target.legend.y + target.entry.y}px`}
            style:width={`${Math.max(24, target.legend.width)}px`}
            onpointerenter={(event) => {
              if (event.pointerType !== "touch")
                previewLegendIndex(index, "pointer");
            }}
            onpointerleave={() => previewLegend(null)}
            onpointerdown={(event) => onLegendPointerDown(event, index)}
            onpointerup={(event) => onLegendPointerUp(event, index)}
            onpointercancel={() => (legendTouchIndex = -1)}
            onfocus={() => onLegendFocus(index)}
            onblur={onLegendBlur}
            onclick={(event) => onLegendClick(event, index)}
            onkeydown={(event) => onLegendKeydown(event, index)}
          >
            <span class="gg-sr-only">{target.entry.label}</span>
          </button>
        {/each}
      </div>
    {/if}
    {#if interactionConfig.legendFocus !== null && effectiveLegendPressed !== null}
      {@const focusedLegend = model.scene.legends.find(
        (candidate) => candidate.scale === effectiveLegendPressed?.scale,
      )}
      {#if focusedLegend !== undefined}
        <button
          type="button"
          class="gg-legend-clear"
          aria-label="Clear legend focus"
          style:left={`${Math.max(4, Math.min(focusedLegend.x, model.scene.width - 52))}px`}
          style:top={`${model.scene.height + 4}px`}
          onpointerdown={(event) =>
            (legendClearPointerType = event.pointerType)}
          onpointercancel={() => (legendClearPointerType = null)}
          onclick={(event) => clearLegendFromControl(event)}>Clear</button
        >
      {/if}
    {/if}
    {#if filterableLegendEntries.length > 0}
      <fieldset class="gg-legend-filters">
        <legend>Filter legend</legend>
        {#each filterableLegendEntries as target (`${target.legend.scale}:${target.field}:${target.entry.label}`)}
          <label>
            <input
              type="checkbox"
              checked={target.visible}
              aria-label={`Show ${target.entry.label}`}
              onpointerdown={(event) =>
                (legendFilterPointerType = event.pointerType)}
              onpointercancel={() => (legendFilterPointerType = null)}
              onclick={(event) => toggleLegendFilter(target, event)}
            />
            <span>{target.entry.label}</span>
          </label>
        {/each}
        {#if localLegendFilters.length > 0}
          <button
            type="button"
            aria-label="Reset legend filters"
            onpointerdown={(event) =>
              (legendFilterPointerType = event.pointerType)}
            onpointercancel={() => (legendFilterPointerType = null)}
            onclick={resetLegendFilters}>Reset</button
          >
        {/if}
      </fieldset>
    {/if}
    {#if !interactive && (emphasizedAnchors.length > 0 || selectedAnchors.length > 0)}
      <InteractionOverlay
        width={model.scene.width}
        height={model.scene.height}
        interactive={false}
        {selectedAnchors}
        {emphasizedAnchors}
      />
    {/if}
    {#if surfaceInteractive}
      <InteractionOverlay
        width={model.scene.width}
        height={model.scene.height}
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
      <!-- The capture layer is a pointer-only surface; the accessible
           interaction paths are focusable marks and the data table. -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <div
        bind:this={captureSurface}
        class="gg-capture"
        class:gg-area-tool={activeTool === "select-area" ||
          activeTool === "zoom-area"}
        role="group"
        tabindex="0"
        aria-label={ariaLabel ??
          assembled?.labs?.title ??
          sceneLabel(model.scene)}
        aria-describedby={`${plotId}-description ${plotId}-active`}
        aria-controls={inspection?.state === "pinned" &&
        interactionConfig.inspect?.contentMode === "interactive"
          ? `${plotId}-tooltip`
          : undefined}
        onfocus={() => {
          if (inspection === null) navigate(1);
        }}
        onblur={onSurfaceBlur}
        onpointermove={onPointerMove}
        onpointerleave={onPointerLeave}
        onpointerdown={onPointerDown}
        onpointerup={onPointerUp}
        onpointercancel={() => {
          queuedPointerInspection = null;
          touchInspectStart = null;
          touchInspectMoved = false;
          reducer.cancelScheduledPointer();
          brushRect = null;
          reducer.dispatch({ type: "cancel-area" });
        }}
        onlostpointercapture={() => {
          if (!brushing) return;
          if (!areaAwaitingSecond) brushRect = null;
          reducer.dispatch({ type: "cancel-area" });
        }}
        onclick={onCaptureClick}
        onkeydown={onSurfaceKeyDown}
        ondblclick={onDblClick}
      ></div>
      <p id={`${plotId}-description`} class="gg-sr-only">
        Use arrow keys to inspect data. Press Enter to pin. Press Escape to
        dismiss.
      </p>
      <p id={`${plotId}-active`} class="gg-sr-only">
        {inspection === null
          ? "No active datum"
          : datumLabel(inspection.focus.row)}
      </p>
      <div
        id={`${plotId}-live`}
        class="gg-sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {interactionAnnouncement ||
          (inspection?.source === "keyboard" || inspection?.source === "touch"
            ? inspectionLiveText(inspection)
            : "")}
      </div>
      {#if areaAwaitingSecond}
        <p class="gg-area-instruction">Choose opposite corner</p>
      {/if}
      {#if inspection !== null}
        <Tooltip
          id={`${plotId}-tooltip`}
          {inspection}
          width={Math.min(
            model.scene.width,
            root?.clientWidth ?? model.scene.width,
          )}
          height={Math.min(
            model.scene.height,
            root?.clientHeight ?? model.scene.height,
          )}
          content={interactionConfig.inspect?.content}
          interactive={interactionConfig.inspect?.contentMode === "interactive"}
          docked={inspection.state === "pinned" && resolvedWidth < 480}
          onenter={() => (tooltipHovered = true)}
          onleave={() => {
            tooltipHovered = false;
            if (inspection?.state !== "pinned") setInspection(null, "pointer");
          }}
          onclose={(source) => closeInspection(source, true)}
        />
      {/if}
    {/if}
    {#if emptyPlot}
      <div class="gg-empty-state" role="status">No data to display</div>
    {/if}
    {#if capabilityStatus !== null}
      <p class="gg-capability-status" role="status">{capabilityStatus}</p>
    {/if}
  {/if}
</div>

<style>
  .gg-precise-bounds {
    position: absolute;
    z-index: 4;
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

  .gg-with-docked-tooltip {
    margin-bottom: 260px;
  }

  /* Strata: full-size positioned siblings; document order = paint order
     (no z-index anywhere — decision 0006). All inert; the capture layer
     owns pointer events. Parent-owned so extracted overlay SVGs with
     class gg-stratum stay absolutely positioned. */
  .gg-plot-root :global(.gg-stratum),
  .gg-canvas-a11y {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  canvas.gg-stratum {
    display: block;
  }

  /* sr-only pattern (NOT display:none — must stay in the a11y tree). */
  .gg-canvas-a11y,
  .gg-a11y-toggle:not(:focus) {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .gg-a11y-toggle {
    pointer-events: auto;
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 11px;
    line-height: 1.2;
  }

  .gg-legend-clear {
    position: absolute;
    z-index: 5;
    min-width: 44px;
    min-height: 44px;
    border: 1px solid
      var(--gg-tooltipBorder, var(--gg-theme-tooltipBorder, currentColor));
    border-radius: 3px;
    padding: 2px 6px;
    background: var(--gg-tooltipPaper, var(--gg-theme-tooltipPaper, white));
    color: var(--gg-tooltipInk, var(--gg-theme-tooltipInk, currentColor));
    font: 11px/1.2 var(--gg-font-family, sans-serif);
    white-space: nowrap;
    pointer-events: auto;
  }

  .gg-legend-targets {
    position: absolute;
    inset: 0;
    z-index: 5;
    pointer-events: none;
  }

  .gg-legend-target {
    position: absolute;
    min-width: 24px;
    min-height: 24px;
    margin: 0;
    border: 1px solid transparent;
    border-radius: 3px;
    padding: 0;
    background: transparent;
    color: transparent;
    pointer-events: auto;
    touch-action: manipulation;
  }

  .gg-legend-target:hover,
  .gg-legend-target-active,
  .gg-legend-target[aria-pressed="true"] {
    border-color: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    background: color-mix(in srgb, currentColor 7%, transparent);
  }

  .gg-legend-target:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: -2px;
  }

  .gg-legend-clear:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  .gg-legend-filters {
    position: absolute;
    top: calc(100% + 4px);
    left: 4px;
    z-index: 5;
    display: flex;
    min-height: 44px;
    max-width: calc(100% - 8px);
    margin: 0;
    padding: 0;
    border: 0;
    gap: 4px;
    align-items: center;
    overflow-x: auto;
    color: var(--gg-ink, var(--gg-theme-ink, currentColor));
    font: 11px/1.2 var(--gg-font-family, sans-serif);
    pointer-events: auto;
  }

  .gg-legend-filters legend {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .gg-legend-filters label,
  .gg-legend-filters button {
    display: inline-flex;
    min-height: 44px;
    margin: 0;
    padding: 0 8px;
    align-items: center;
    gap: 5px;
    border: 1px solid
      var(--gg-tooltipBorder, var(--gg-theme-tooltipBorder, currentColor));
    border-radius: 3px;
    background: var(--gg-tooltipPaper, var(--gg-theme-tooltipPaper, white));
    color: inherit;
    font: inherit;
    white-space: nowrap;
  }

  .gg-legend-filters input {
    width: 18px;
    height: 18px;
    margin: 0;
  }

  .gg-legend-filters label:has(:focus-visible),
  .gg-legend-filters button:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  .gg-a11y-table {
    position: absolute;
    inset: 0;
    overflow: auto;
    background: var(--gg-paper, #fff);
    color: var(--gg-ink, #1f2328);
    font-size: 11px;
    line-height: 1.4;
    pointer-events: auto;
  }

  .gg-a11y-table table {
    border-collapse: collapse;
  }

  .gg-a11y-table th,
  .gg-a11y-table td {
    border: 1px solid var(--gg-grid, rgba(128, 128, 128, 0.4));
    padding: 2px 6px;
    text-align: left;
  }

  .gg-capture {
    position: absolute;
    inset: 0;
    pointer-events: auto;
    touch-action: pan-y pinch-zoom;
    background: transparent;
  }

  .gg-capture.gg-area-tool {
    touch-action: none;
    cursor: crosshair;
  }

  .gg-capture:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  .gg-area-instruction {
    position: absolute;
    right: 8px;
    bottom: 8px;
    z-index: 2;
    margin: 0;
    border-radius: 3px;
    padding: 4px 7px;
    background: var(--gg-tooltipBg, var(--gg-theme-tooltipBg, #fff));
    color: var(--gg-foreground, var(--gg-theme-foreground, currentColor));
    font-size: 13px;
    line-height: 1.25;
    pointer-events: none;
  }

  .gg-empty-state {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: var(
      --gg-interactionMuted,
      var(--gg-theme-interactionMuted, currentColor)
    );
    font: 12px/1.4 var(--gg-font-family, sans-serif);
    pointer-events: none;
  }

  .gg-capability-status {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    margin: 0;
    color: var(
      --gg-interactionMuted,
      var(--gg-theme-interactionMuted, currentColor)
    );
    font: 11px/1.4 var(--gg-font-family, sans-serif);
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

  .gg-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .gg-plot-root * {
      scroll-behavior: auto;
      transition: none !important;
      animation: none !important;
    }
  }

  @media (forced-colors: active) {
    .gg-capture:focus-visible {
      outline-color: Highlight;
    }
  }
</style>
