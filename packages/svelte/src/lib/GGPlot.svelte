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
  import { gg, normalize } from "@ggsvelte/spec";
  import type {
    CandidateFacts,
    CellValue,
    GeometryBatch,
    RenderModel,
    ScaleState,
  } from "@ggsvelte/core";
  import { planStrata, runPipeline, sceneLabel } from "@ggsvelte/core";
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
  import type { LayerDescriptor } from "./registry.svelte.js";
  import { provideRegistry } from "./registry.svelte.js";
  import SceneView from "./SceneView.svelte";
  import Tooltip from "./Tooltip.svelte";

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
    tool,
    interaction,
    interactionScope,
    ariaLabel,
    oninspect,
    onselect,
    onzoom,
    oninteraction,
    ondiagnostic,
    ontoolchange,
    onrender,
    children,
  }: Props = $props();

  const registry = provideRegistry();

  const clamp = (v: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, v));

  /** Invert a normalized [t0, t1] window through a positional scale (band
   *  scales cannot zoom — documented M2 limitation). */
  function invertedDomain(
    scale: RenderModel["scales"]["x"],
    t0: number,
    t1: number,
  ): [number, number] | undefined {
    if (scale.type === "band") return undefined;
    const a = scale.invert(t0);
    const b = scale.invert(t1);
    return a <= b ? [a, b] : [b, a];
  }

  function frozenZoomDomains(domains: ZoomDomains): ZoomDomains {
    return Object.freeze({
      ...(domains.x !== undefined && {
        x: Object.freeze([...domains.x]) as unknown as [number, number],
      }),
      ...(domains.y !== undefined && {
        y: Object.freeze([...domains.y]) as unknown as [number, number],
      }),
    });
  }

  function toLayerInput(descriptor: LayerDescriptor): LayerInput {
    // Reading .aes/.position/.params here goes through the child's live
    // getters, so geom prop changes flow into this $derived without
    // re-registration.
    return {
      geom: descriptor.geom,
      ...(descriptor.stat !== undefined && { stat: descriptor.stat }),
      ...(descriptor.position !== undefined && {
        position: descriptor.position,
      }),
      ...(descriptor.positionParams !== undefined && {
        positionParams: descriptor.positionParams,
      }),
      ...(descriptor.render !== undefined && { render: descriptor.render }),
      ...(descriptor.aes !== undefined && { aes: descriptor.aes }),
      ...(descriptor.params !== undefined && { params: descriptor.params }),
    } as LayerInput;
  }

  const assembled: PortableSpec | null = $derived.by(() => {
    if (spec !== undefined) return normalize(spec);
    const layerInputs: LayerInput[] =
      layers ?? registry.layers.map(toLayerInput);
    if (layerInputs.length === 0) return null;
    let builder = gg(data as DataInput, mapping);
    for (const layer of layerInputs) builder = builder.layer(layer);
    if (facet !== undefined) builder = builder.facet(facet);
    if (coord !== undefined) builder = builder.coord(coord);
    if (a11y !== undefined) builder = builder.a11y(a11y);
    if (scales !== undefined) builder = builder.scales(scales);
    if (legend !== undefined) builder = builder.legend(legend);
    if (theme !== undefined) builder = builder.theme(theme);
    if (labs !== undefined) builder = builder.labs(labs);
    return builder.spec();
  });

  function mappedScope(channel: "x" | "y"): string {
    const channelValue =
      assembled?.aes?.[channel] ??
      assembled?.layers.find(
        (layer) =>
          layer.aes?.[channel] !== undefined && layer.aes[channel] !== null,
      )?.aes?.[channel];
    return channelValue !== undefined &&
      channelValue !== null &&
      "field" in channelValue
      ? channelValue.field
      : channel;
  }

  const resolvedInteractionScope: PlotInteractionScope = $derived.by(() => {
    if (interaction !== undefined) {
      if (interactionScope === undefined)
        throw new TypeError(
          "GGPlot requires interactionScope when interaction is supplied so unrelated charts cannot share semantic keys or domains accidentally.",
        );
      const zoomMode =
        zoom === true ? "xy" : typeof zoom === "object" ? zoom.mode : null;
      if (zoomMode !== null) {
        if (zoomMode !== "y" && interactionScope.x === undefined)
          throw new TypeError(
            "Controlled x zoom requires interactionScope.x; controlled plots never infer domain scopes.",
          );
        if (zoomMode !== "x" && interactionScope.y === undefined)
          throw new TypeError(
            "Controlled y zoom requires interactionScope.y; controlled plots never infer domain scopes.",
          );
      }
      return Object.freeze({
        keys: interactionScope.keys,
        ...(interactionScope.x !== undefined && { x: interactionScope.x }),
        ...(interactionScope.y !== undefined && { y: interactionScope.y }),
      });
    }
    return Object.freeze({
      keys: typeof datumKey === "string" ? String(datumKey) : "default",
      x: mappedScope("x"),
      y: mappedScope("y"),
    });
  });

  const interactionConfig = $derived(
    normalizeInteractionConfig(
      { inspect, select, zoom, ...(tool !== undefined && { tool }) },
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
  const controllerRevision = $derived(interaction?.revision ?? 0);
  const effectiveZoomDomains: ZoomDomains | null = $derived.by(() => {
    void controllerRevision;
    if (interaction === undefined) return localZoomDomains;
    const domains = interaction.zoom(resolvedInteractionScope);
    return domains.x === undefined && domains.y === undefined
      ? null
      : (domains as ZoomDomains);
  });

  const zoomScale = (config: Scales["x"], domain: [number, number]) => ({
    ...config,
    domain: [domain[0], domain[1]],
    nice: false,
  });

  const effectiveSpec: PortableSpec | null = $derived.by(() => {
    if (assembled === null || effectiveZoomDomains === null) return assembled;
    return {
      ...assembled,
      scales: {
        ...assembled.scales,
        ...(effectiveZoomDomains.x !== undefined && {
          x: zoomScale(assembled.scales?.x, effectiveZoomDomains.x),
        }),
        ...(effectiveZoomDomains.y !== undefined && {
          y: zoomScale(assembled.scales?.y, effectiveZoomDomains.y),
        }),
      },
    };
  });

  // Source identity/order epoch: stable through responsive layout and zoom
  // respecs, different when normalized inline data or data references change.
  const sourceIdentities = new WeakMap<object, number>();
  let nextSourceIdentity = 1;
  function sourceIdentity(value: unknown): string {
    if (
      (typeof value !== "object" && typeof value !== "function") ||
      value === null
    )
      return String(value);
    let identity = sourceIdentities.get(value);
    if (identity === undefined) {
      identity = nextSourceIdentity++;
      sourceIdentities.set(value, identity);
    }
    return String(identity);
  }
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

  // Canvas first-paint tracking: data-gg-ready waits for every canvas
  // stratum of the CURRENT model to have painted at least once.
  let paintedFor = $state(-1);
  let paintedCount = $state(0);
  function notifyPainted(runId: number): void {
    if (paintedFor === runId) {
      paintedCount += 1;
    } else {
      paintedFor = runId;
      paintedCount = 1;
    }
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
  function canvasAttachment(m: RenderModel, batches: GeometryBatch[]) {
    void themeEpoch;
    return (canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (ctx === null) return;
      const dpr = window.devicePixelRatio || 1;
      sizeCanvasForDpr(canvas, ctx, m.scene.width, m.scene.height, dpr);
      drawStratum(ctx, m.scene, batches, cssColorResolver(canvas));
      // untrack: the attachment must WRITE paint state without SUBSCRIBING
      // to it (a tracked read here would re-trigger the attachment -> loop).
      untrack(() => notifyPainted(m.runId));
    };
  }

  /** Rows referenced by a canvas stratum, capped for the a11y table. */
  const A11Y_TABLE_CAP = 100;
  function a11yRows(
    m: RenderModel,
    batches: GeometryBatch[],
  ): { fields: string[]; rows: CellValue[][]; total: number } {
    const rowSet = new Set<number>();
    for (const batch of batches) {
      for (const raw of batch.rowIndex) {
        if (raw !== 0xffffffff) rowSet.add(raw);
      }
    }
    const fieldSet = new Set<string>();
    for (const batch of batches) {
      for (const f of m.layerFields[batch.layerIndex] ?? [])
        fieldSet.add(f.field);
    }
    const fields = [...fieldSet];
    const rows: CellValue[][] = [];
    for (const index of [...rowSet].toSorted((a, b) => a - b)) {
      if (rows.length >= A11Y_TABLE_CAP) break;
      const row = m.row(index);
      if (row !== null) rows.push(fields.map((f) => row[f] ?? null));
    }
    return { fields, rows, total: rowSet.size };
  }
  let a11yTableOpen = $state(false);

  // ---------------------------------------------------------- interaction
  // source rows/spec -> pipeline/scene -> hit index -> semantic resolver ->
  // chart-local reducer -> tooltip/crosshair/tools/callbacks. Presentation
  // consumes one resolved inspection and never reconstructs grouping itself.
  const interactive = $derived(interactionConfig.interactive);
  const hitIndex: SceneHitIndex | null = $derived.by(() =>
    interactive && model !== null ? buildHitIndex(model.scene) : null,
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
        const pending = queuedPointerInspection;
        const token = queuedPointerToken;
        queuedPointerInspection = null;
        queuedPointerToken = null;
        if (pending === null) return;
        if (token !== null && !reducer.accepts(token)) return;
        if (inspection?.state === "pinned") {
          pendingPinnedPointer = pending;
          return;
        }
        if (
          action.candidate !== null &&
          action.candidate.epoch !== model?.runId
        )
          return;
        setInspection(
          pending.hit,
          pending.source,
          "transient",
          pending.concreteMode,
          pending.candidate,
        );
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
  const effectiveSelectedKeys: readonly PropertyKey[] = $derived.by(() => {
    void controllerRevision;
    return interaction?.selected(resolvedInteractionScope) ?? localSelectedKeys;
  });
  const effectiveEmphasisKeys: readonly PropertyKey[] = $derived.by(() => {
    void controllerRevision;
    return interaction?.emphasized(resolvedInteractionScope) ?? [];
  });
  let committedInterval = $state<IntervalSelection | null>(null);
  const zoomHasSupportedChannel = $derived.by(() => {
    if (interactionConfig.zoom === null || model === null) return true;
    const mode = interactionConfig.zoom.mode;
    return (
      (mode !== "y" && model.scales.x.type !== "band") ||
      (mode !== "x" && model.scales.y.type !== "band")
    );
  });
  const availableTools = $derived(
    interactionConfig.availableTools.filter(
      (available) => available !== "zoom-area" || zoomHasSupportedChannel,
    ),
  );
  const showToolRail = $derived(
    interactive &&
      (availableTools.length > 1 ||
        effectiveSelectedKeys.length > 0 ||
        committedInterval !== null ||
        effectiveZoomDomains !== null),
  );
  const emptyPlot = $derived(
    model !== null &&
      model.scene.batches.every((batch) => batch.rowIndex.length === 0),
  );
  const areaScaleDiagnostics = $derived.by(() => {
    if (model === null) return [] as InteractionDiagnostic[];
    const modes =
      interactionConfig.zoom === null ? [] : [interactionConfig.zoom.mode];
    const channels = new Set<"x" | "y">();
    for (const mode of modes) {
      if (mode !== "y" && model.scales.x.type === "band") channels.add("x");
      if (mode !== "x" && model.scales.y.type === "band") channels.add("y");
    }
    return [...channels].map((channel) => ({
      ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INTERVAL_SCALE_UNSUPPORTED,
      prop: `scales.${channel}`,
      actual: "band",
    }));
  });
  const capabilityStatus = $derived.by(() => {
    const unavailable = interactionConfig.diagnostics.find(
      (diagnostic) =>
        diagnostic.code === "INTERACTION_INTERVAL_FACET_UNSUPPORTED",
    );
    if (unavailable !== undefined)
      return `Area interaction unavailable: ${unavailable.message}`;
    if (areaScaleDiagnostics.length > 0)
      return `Zoom ${zoomHasSupportedChannel ? "limited" : "unavailable"}: ${areaScaleDiagnostics[0]!.message}`;
    if (
      interactive &&
      !emptyPlot &&
      model !== null &&
      model.candidates.size === 0
    )
      return "No inspectable marks";
    return null;
  });
  const themeStyle = $derived.by(() => {
    if (model === null) return "";
    const tokens = model.scene.theme;
    return [
      ["interactionInk", tokens.interactionInk],
      ["interactionMuted", tokens.interactionMuted],
      ["focusRing", tokens.focusRing],
      ["crosshair", tokens.crosshair],
      ["selectionFill", tokens.selectionFill],
      ["selectionStroke", tokens.selectionStroke],
      ["tooltipPaper", tokens.tooltipPaper],
      ["tooltipInk", tokens.tooltipInk],
      ["tooltipBorder", tokens.tooltipBorder],
      ["toolActive", tokens.toolActive],
    ]
      .map(([role, value]) => `--gg-theme-${role}:${value}`)
      .join(";");
  });
  const rootStyle = $derived(
    `${hasCanvas || interactive || effectiveEmphasisKeys.length > 0 ? `width:${width === undefined || width === "container" ? "100%" : `${model?.scene.width ?? resolvedWidth}px`};height:${model?.scene.height ?? resolvedHeight}px;` : ""}${themeStyle}` ||
      undefined,
  );
  function anchorsForKeys(keys: readonly PropertyKey[]): {
    x: number;
    y: number;
  }[] {
    if (model === null || keys.length === 0) return [];
    const keySet = new Set(keys);
    const anchors: { x: number; y: number }[] = [];
    const seen = new Set<string>();
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate === null) continue;
      let selected = false;
      for (const key of candidateSemanticKeys(candidate)) {
        if (!keySet.has(key)) continue;
        selected = true;
        break;
      }
      const identity = `${String(candidate.x)}:${String(candidate.y)}`;
      if (selected && !seen.has(identity)) {
        seen.add(identity);
        anchors.push({ x: candidate.x, y: candidate.y });
      }
    }
    return anchors;
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
      if (
        next.length === localSelectedKeys.length &&
        next.every((key, index) => Object.is(key, localSelectedKeys[index]))
      )
        return;
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
    emitSelection(
      Object.freeze({
        type: "select",
        phase: committed.length === 0 ? "clear" : "end",
        mode: "point",
        keys: Object.freeze([...committed]),
        source,
      }),
    );
  }

  function clearPointSelection(source: InteractionSource): void {
    if (effectiveSelectedKeys.length === 0) return;
    commitPointSelection([], source);
  }

  function clearIntervalSelection(source: InteractionSource): void {
    if (committedInterval === null) return;
    const event: IntervalSelection = Object.freeze({
      type: "select",
      phase: "clear",
      mode: committedInterval.mode,
      panelId: committedInterval.panelId,
      domain: Object.freeze({}),
      pixels: Object.freeze({ ...committedInterval.pixels }),
      keys: Object.freeze([]),
      lineageCount: 0,
      source,
    });
    committedInterval = null;
    emitSelection(event);
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
  const priorKeys = new Map<string, PropertyKey>();

  const semanticKeys = $derived.by(() => {
    const keys = new Map<number, PropertyKey | null>();
    const diagnostics: InteractionDiagnostic[] = [];
    if (model === null || datumKey === undefined) return { keys, diagnostics };
    const owners = new Map<PropertyKey, number>();
    const sourceRows = new Set<number>();
    if (
      model.candidates.size === 0 &&
      assembled?.layers.some(
        (layer) =>
          layer.geom === "rule" &&
          (layer.params?.["xintercept"] !== undefined ||
            layer.params?.["yintercept"] !== undefined),
      )
    )
      diagnostics.push({
        ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_MISSING_LINEAGE,
        actual: "synthetic rule has no source rows",
      });
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (candidate === null) continue;
      if (candidate.rowIndex !== null) sourceRows.add(candidate.rowIndex);
      const lineageRows = [...model.lineage.keys(candidate.lineage)];
      if (candidate.rowIndex === null && lineageRows.length === 0)
        diagnostics.push({
          ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_MISSING_LINEAGE,
          actual: {
            layerIndex: candidate.layerIndex,
            candidateId: candidate.id,
          },
        });
      for (const rowIndex of lineageRows) sourceRows.add(rowIndex);
    }
    for (const rowIndex of sourceRows) {
      const row = model.row(rowIndex);
      const value =
        row === null
          ? null
          : typeof datumKey === "function"
            ? (datumKey as (row: Row, index: number) => PropertyKey)(
                row as Row,
                rowIndex,
              )
            : row[datumKey as string];
      if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "symbol"
      ) {
        keys.set(rowIndex, null);
        diagnostics.push({
          ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_INVALID_KEY,
          actual: value,
        });
        continue;
      }
      if (row !== null) {
        const rowIdentity = `${sourceIdentity(data)}:${sourceIdentity(spec)}:${rowIndex}`;
        const priorKey = priorKeys.get(rowIdentity);
        if (priorKey !== undefined && priorKey !== value) {
          keys.set(rowIndex, null);
          diagnostics.push({
            ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_UNSTABLE_KEY,
            actual: { previous: priorKey, current: value },
          });
          continue;
        }
        priorKeys.set(rowIdentity, value);
      }
      const prior = owners.get(value);
      if (prior !== undefined && prior !== rowIndex) {
        keys.set(prior, null);
        keys.set(rowIndex, null);
        diagnostics.push({
          ...INTERACTION_DIAGNOSTIC_CATALOG.INTERACTION_DUPLICATE_KEY,
          actual: value,
        });
      } else {
        owners.set(value, rowIndex);
        keys.set(rowIndex, value);
      }
    }
    return { keys, diagnostics };
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
    if (!interactive) return;
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
    if (scene === undefined || rect.width === 0 || rect.height === 0)
      return { x: 0, y: 0 };
    return {
      x: ((event.clientX - rect.left) / rect.width) * scene.width,
      y: ((event.clientY - rect.top) / rect.height) * scene.height,
    };
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
    const keys: PropertyKey[] = [];
    const rows = new Set(model.lineage.keys(candidate.lineage));
    if (candidate.rowIndex !== null) rows.add(candidate.rowIndex);
    for (const rowIndex of rows) {
      const key = semanticKey(model.row(rowIndex), rowIndex);
      if (key !== null && !keys.includes(key)) keys.push(key);
    }
    return keys;
  }

  const inspectionCoordinator = createInspectionCoordinator<
    Record<string, CellValue>,
    PropertyKey
  >((_row, index) => semanticKeys.keys.get(index) ?? null);

  $effect(() => () => inspectionCoordinator.invalidate());

  function hitFromCandidate(candidate: CandidateFacts): SceneHit {
    return {
      layerIndex: candidate.layerIndex,
      panelIndex: candidate.panelIndex,
      rowIndex: candidate.rowIndex,
      x: candidate.x,
      y: candidate.y,
      kind: candidate.kind,
    };
  }

  function candidateFromHit(hit: SceneHit): CandidateFacts | null {
    if (model === null) return null;
    for (let id = 0; id < model.candidates.size; id++) {
      const candidate = model.candidates.candidate(id);
      if (
        candidate !== null &&
        candidate.layerIndex === hit.layerIndex &&
        candidate.panelIndex === hit.panelIndex &&
        candidate.rowIndex === hit.rowIndex &&
        candidate.kind === hit.kind &&
        Math.abs(candidate.x - hit.x) < 0.5 &&
        Math.abs(candidate.y - hit.y) < 0.5
      )
        return candidate;
    }
    return null;
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
    if (model === null) return [];
    const hits: SceneHit[] = [];
    let id = model.candidates.traverse(null, "first");
    const seen = new Set<number>();
    while (id !== null && !seen.has(id)) {
      seen.add(id);
      const candidate = model.candidates.candidate(id);
      if (candidate !== null) hits.push(hitFromCandidate(candidate));
      id = model.candidates.traverse(id, "next");
    }
    return hits;
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
    const fingerprint =
      semanticFingerprint ??
      (next.phase === "clear"
        ? `clear:${next.source}`
        : `${next.mode}:${next.state}:${next.panelId}:${String(next.focus.key)}:${next.members.map((m) => `${m.layerIndex}:${String(m.key)}`).join(",")}`);
    if (fingerprint === lastInspectionFingerprint) return;
    lastInspectionFingerprint = fingerprint;
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
    if (event.pointerType === "touch" && touchInspectStart !== null) {
      touchInspectMoved ||=
        Math.hypot(p.x - touchInspectStart.x, p.y - touchInspectStart.y) >= 4;
      if (touchInspectMoved && activeTool === "inspect") {
        queuedPointerInspection = null;
        reducer.cancelScheduledPointer();
        return;
      }
    }
    if (brushing && brushRect !== null) {
      queuedAreaSource = event.pointerType === "touch" ? "touch" : "pointer";
      reducer.queuePointer({ type: "move-area", point: p });
      return;
    }
    if (activeTool === "inspect" && interactionConfig.inspect !== null) {
      const match =
        model?.candidates.nearest(p.x, p.y, {
          mode: interactionConfig.inspect.mode,
          maxDistance: interactionConfig.inspect.maxDistance,
        }) ?? null;
      const resolvedHit =
        match === null
          ? (hitIndex?.hitTest(p.x, p.y) ?? null)
          : hitFromCandidate(match);
      const source = event.pointerType === "touch" ? "touch" : "pointer";
      queuedPointerInspection = {
        hit: resolvedHit,
        source,
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
        source,
      });
    }
  }

  function applyAreaMove(
    point: Readonly<{ x: number; y: number }>,
    source: InteractionSource,
  ): void {
    if (!brushing || brushRect === null) return;
    brushRect = { ...brushRect, x1: point.x, y1: point.y };
    if (activeTool === "select-area")
      emitSelection(
        selectionEvent("change", normalizedRect(brushRect), source),
      );
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
    queuedPointerInspection = null;
    reducer.cancelScheduledPointer();
    if (activeTool === "inspect" && event.pointerType === "touch") {
      touchInspectStart = plotPoint(event);
      touchInspectMoved = false;
      return;
    }
    if (
      event.button !== 0 ||
      (activeTool !== "select-area" && activeTool !== "zoom-area")
    )
      return;
    const p = plotPoint(event);
    brushRect =
      areaAwaitingSecond && brushRect !== null
        ? { ...brushRect, x1: p.x, y1: p.y }
        : { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    setInspection(null, event.pointerType === "touch" ? "touch" : "pointer");
    reducer.dispatch({ type: "begin-area", point: p, panelId: panelId(0) });
    if (activeTool === "select-area" && !areaAwaitingSecond) {
      const startEvent = selectionEvent(
        "start",
        normalizedRect(brushRect),
        event.pointerType === "touch" ? "touch" : "pointer",
      );
      emitSelection(startEvent);
    }
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events may not register a browser pointer id. The reducer
      // still owns cancellation; real pointer streams retain capture.
    }
  }

  function selectionEvent(
    phase: IntervalSelection["phase"],
    rect: ReturnType<typeof normalizedRect>,
    source: InteractionSource,
  ): IntervalSelection {
    const mode = interactionConfig.select?.mode ?? "xy";
    const panel = model?.scene.panels[0];
    const flip = assembled?.coord?.type === "flip";
    const query =
      panel === undefined
        ? rect
        : mode === "x"
          ? flip
            ? { ...rect, x0: panel.x, x1: panel.x + panel.width }
            : { ...rect, y0: panel.y, y1: panel.y + panel.height }
          : mode === "y"
            ? flip
              ? { ...rect, y0: panel.y, y1: panel.y + panel.height }
              : { ...rect, x0: panel.x, x1: panel.x + panel.width }
            : rect;
    const candidates =
      model === null
        ? []
        : [
            ...model.candidates.queryRect(
              query.x0,
              query.y0,
              query.x1,
              query.y1,
            ),
          ]
            .map((id) => model!.candidates.candidate(id))
            .filter(
              (candidate): candidate is CandidateFacts => candidate !== null,
            );
    const sourceRows = new Set<number>();
    for (const candidate of candidates)
      for (const rowIndex of model?.lineage.keys(candidate.lineage) ?? [])
        sourceRows.add(rowIndex);
    const keys = [
      ...new Set(
        [...sourceRows]
          .map((rowIndex) =>
            semanticKey(model?.row(rowIndex) ?? null, rowIndex),
          )
          .filter((key): key is PropertyKey => key !== null),
      ),
    ];
    const domain: { x?: [CellValue, CellValue]; y?: [CellValue, CellValue] } =
      {};
    if (model !== null && model.scene.panels.length === 1) {
      const solePanel = model.scene.panels[0]!;
      const tx0 = clamp((rect.x0 - solePanel.x) / solePanel.width, 0, 1);
      const tx1 = clamp((rect.x1 - solePanel.x) / solePanel.width, 0, 1);
      const ty0 = clamp(1 - (rect.y1 - solePanel.y) / solePanel.height, 0, 1);
      const ty1 = clamp(1 - (rect.y0 - solePanel.y) / solePanel.height, 0, 1);
      const horizontalDomain = invertedDomain(
        flip ? model.scales.y : model.scales.x,
        tx0,
        tx1,
      );
      const verticalDomain = invertedDomain(
        flip ? model.scales.x : model.scales.y,
        ty0,
        ty1,
      );
      const xDomain = flip ? verticalDomain : horizontalDomain;
      const yDomain = flip ? horizontalDomain : verticalDomain;
      if (mode !== "y" && xDomain !== undefined) domain.x = xDomain;
      if (mode !== "x" && yDomain !== undefined) domain.y = yDomain;
    }
    const frozenDomain = Object.freeze({
      ...(domain.x !== undefined && {
        x: Object.freeze([...domain.x]) as [CellValue, CellValue],
      }),
      ...(domain.y !== undefined && {
        y: Object.freeze([...domain.y]) as [CellValue, CellValue],
      }),
    });
    return Object.freeze({
      type: "select",
      phase,
      mode: interactionConfig.select?.mode ?? "xy",
      panelId: panelId(0),
      domain: frozenDomain,
      pixels: Object.freeze({ ...rect }),
      keys: Object.freeze([...keys]),
      lineageCount: sourceRows.size,
      source,
    });
  }

  function onPointerUp(event: PointerEvent): void {
    if (
      activeTool === "inspect" &&
      event.pointerType === "touch" &&
      interactionConfig.inspect !== null &&
      touchInspectStart !== null
    ) {
      const wasTap = !touchInspectMoved;
      touchInspectStart = null;
      touchInspectMoved = false;
      if (!wasTap) return;
      const p = plotPoint(event);
      const match = model?.candidates.nearest(p.x, p.y, {
        mode: interactionConfig.inspect.mode,
        maxDistance: interactionConfig.inspect.maxDistance,
      });
      if (match !== null && match !== undefined) {
        setInspection(
          hitFromCandidate(match),
          "touch",
          interactionConfig.inspect.pin ? "pinned" : "transient",
          match.mode,
          match,
        );
        suppressClickUntil = performance.now() + 500;
      }
      return;
    }
    if (!brushing || brushRect === null) return;
    reducer.cancelScheduledPointer();
    const source = event.pointerType === "touch" ? "touch" : "pointer";
    const rect = normalizedRect({
      ...brushRect,
      ...Object.fromEntries(
        Object.entries(plotPoint(event)).map(([k, v]) => [
          k === "x" ? "x1" : "y1",
          v,
        ]),
      ),
    } as { x0: number; y0: number; x1: number; y1: number });
    if (rect.x1 - rect.x0 < 4 && rect.y1 - rect.y0 < 4) {
      brushRect = rect;
      announceInteraction("Choose opposite corner.");
      return;
    }
    brushRect = null;
    if (activeTool === "select-area") {
      const eventValue = selectionEvent("end", rect, source);
      committedInterval = interactionConfig.select?.persistent
        ? eventValue
        : null;
      emitSelection(eventValue);
    } else if (activeTool === "zoom-area") {
      applyBrushZoom(rect, source);
    }
    reducer.dispatch({ type: "cancel-area" });
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
    const event: ZoomEvent = Object.freeze({
      type: "zoom",
      phase: committed === null ? "clear" : "end",
      source,
      domains: committed,
    });
    announceInteraction(committed === null ? "Zoom reset." : "Zoom complete.");
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
    const next: ZoomDomains = { ...effectiveZoomDomains };
    for (const channel of ["x", "y"] as const) {
      const domain = domains[channel];
      if (domain === undefined) continue;
      const scale = model?.scales[channel];
      if (
        scale?.type === "band" ||
        domain.length !== 2 ||
        !domain.every((value) => Number.isFinite(value))
      )
        continue;
      next[channel] = [domain[0], domain[1]];
    }
    if (next.x === undefined && next.y === undefined) return;
    commitZoom(frozenZoomDomains(next), "programmatic");
  }

  function onDblClick(): void {
    if (interactionConfig.zoom === null) return;
    resetZoom("pointer");
  }

  function normalizedRect(r: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }) {
    return {
      x0: Math.min(r.x0, r.x1),
      y0: Math.min(r.y0, r.y1),
      x1: Math.max(r.x0, r.x1),
      y1: Math.max(r.y0, r.y1),
    };
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
    const th0 = clamp((rect.x0 - panel.x) / panel.width, 0, 1);
    const th1 = clamp((rect.x1 - panel.x) / panel.width, 0, 1);
    const tv0 = clamp(1 - (rect.y1 - panel.y) / panel.height, 0, 1);
    const tv1 = clamp(1 - (rect.y0 - panel.y) / panel.height, 0, 1);
    if (th1 - th0 <= 0 && tv1 - tv0 <= 0) return;
    const hScale = flip ? model.scales.y : model.scales.x;
    const vScale = flip ? model.scales.x : model.scales.y;
    const next: ZoomDomains = { ...effectiveZoomDomains };
    const hDomain = invertedDomain(hScale, th0, th1);
    const vDomain = invertedDomain(vScale, tv0, tv1);
    const mode = interactionConfig.zoom?.mode ?? "xy";
    const horizontalChannel = flip ? "y" : "x";
    const verticalChannel = flip ? "x" : "y";
    if (hDomain !== undefined && mode !== verticalChannel)
      next[horizontalChannel] = hDomain;
    if (vDomain !== undefined && mode !== horizontalChannel)
      next[verticalChannel] = vDomain;
    if (next.x === undefined && next.y === undefined) return;
    commitZoom(frozenZoomDomains(next), source);
  }

  /** Accessible per-mark label from the layer's mapped fields. */
  function markLabel(row: number): string {
    if (model === null) return `data point ${row + 1}`;
    const values = model.row(row);
    if (values === null) return `data point ${row + 1}`;
    const fields = model.layerFields.flat();
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const f of fields) {
      if (seen.has(f.field)) continue;
      seen.add(f.field);
      parts.push(`${f.field} ${String(values[f.field] ?? "")}`);
    }
    return parts.join(", ") || `data point ${row + 1}`;
  }

  function datumLabel(values: Record<string, CellValue> | null): string {
    if (values === null) return "No active datum";
    const fields = model?.layerFields.flat() ?? [];
    const seen = new Set<string>();
    const parts: string[] = [];
    for (const field of fields) {
      if (seen.has(field.field)) continue;
      seen.add(field.field);
      parts.push(`${field.field} ${String(values[field.field] ?? "")}`);
    }
    return parts.join(", ") || "Active datum";
  }

  function inspectionLiveText(
    value: PlotInspectionChange<Record<string, CellValue>, PropertyKey>,
  ): string {
    const count = value.members.length;
    const state = value.state === "pinned" ? ", pinned" : "";
    if (value.mode !== "x" && value.mode !== "y")
      return `${datumLabel(value.focus.row)}; ${String(count)} ${count === 1 ? "datum" : "data"}${state}`;
    const seen = new Set<string>();
    const focused = value.focus.fields
      .filter(
        (field) =>
          field.channel !== value.mode &&
          !seen.has(field.field) &&
          seen.add(field.field),
      )
      .map((field) => `${field.field} ${String(field.value ?? "")}`)
      .join(", ");
    return `${value.mode} ${value.axisLabel}; ${String(count)} ${count === 1 ? "datum" : "data"}${focused ? `; focused ${focused}` : ""}${state}`;
  }

  function navigate(delta: number): void {
    if (traversalHits.length === 0) return;
    activeTraversalIndex =
      (activeTraversalIndex + delta + traversalHits.length) %
      traversalHits.length;
    setInspection(traversalHits[activeTraversalIndex]!, "keyboard");
  }

  function navigateDirection(dx: number, dy: number): void {
    if (traversalHits.length === 0) return;
    if (inspection === null) {
      navigate(1);
      return;
    }
    const origin = inspection.focus.anchor;
    let bestIndex = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let index = 0; index < traversalHits.length; index++) {
      const hit = traversalHits[index]!;
      const horizontal = hit.x - origin.x;
      const vertical = hit.y - origin.y;
      const primary = horizontal * dx + vertical * dy;
      if (primary <= 0) continue;
      const orthogonal = Math.abs(horizontal * dy - vertical * dx);
      const score = primary + orthogonal * 2;
      // Equal geometric candidates resolve to the later paint/source order,
      // matching the deterministic topmost representative used by pointer hit testing.
      if (score > bestScore) continue;
      bestScore = score;
      bestIndex = index;
    }
    if (bestIndex < 0) return;
    activeTraversalIndex = bestIndex;
    setInspection(traversalHits[bestIndex]!, "keyboard");
  }

  function cycleCoincident(delta: number): void {
    if (inspection === null) {
      navigate(1);
      return;
    }
    const anchor = inspection.focus.anchor;
    const coincident = traversalHits
      .map((hit, index) => ({ hit, index }))
      .filter(
        ({ hit }) =>
          Math.abs(hit.x - anchor.x) < 0.5 && Math.abs(hit.y - anchor.y) < 0.5,
      );
    if (coincident.length < 2) return;
    const current = Math.max(
      0,
      coincident.findIndex(({ index }) => index === activeTraversalIndex),
    );
    const next =
      coincident[(current + delta + coincident.length) % coincident.length]!;
    activeTraversalIndex = next.index;
    setInspection(next.hit, "keyboard");
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
    const allSelected = keys.every((key) =>
      effectiveSelectedKeys.includes(key),
    );
    const next = allSelected
      ? effectiveSelectedKeys.filter((key) => !keys.includes(key))
      : interactionConfig.select?.multiple
        ? [...new Set([...effectiveSelectedKeys, ...keys])]
        : [...keys];
    commitPointSelection(next, source);
  }

  function onSurfaceKeyDown(event: KeyboardEvent): void {
    if (
      (activeTool === "select-area" || activeTool === "zoom-area") &&
      event.key.startsWith("Arrow") &&
      brushRect !== null
    ) {
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const panel = inspectionPanel ?? model?.scene.panels[0];
      if (panel === undefined) return;
      const dx =
        event.key === "ArrowLeft"
          ? -step
          : event.key === "ArrowRight"
            ? step
            : 0;
      const dy =
        event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      brushRect = {
        ...brushRect,
        x1: clamp(brushRect.x1 + dx, panel.x, panel.x + panel.width),
        y1: clamp(brushRect.y1 + dy, panel.y, panel.y + panel.height),
      };
      reducer.dispatch({
        type: "move-area",
        point: { x: brushRect.x1, y: brushRect.y1 },
      });
      return;
    }
    if (
      (activeTool === "select-area" || activeTool === "zoom-area") &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      const anchor =
        inspection?.focus.anchor ??
        (() => {
          const panel = model?.scene.panels[0];
          return panel === undefined
            ? { x: 0, y: 0 }
            : { x: panel.x + panel.width / 2, y: panel.y + panel.height / 2 };
        })();
      if (brushRect === null) {
        brushRect = { x0: anchor.x, y0: anchor.y, x1: anchor.x, y1: anchor.y };
        reducer.dispatch({
          type: "begin-area",
          point: anchor,
          panelId: panelId(0),
        });
        announceInteraction("Choose opposite corner.");
      } else {
        const rect = normalizedRect(brushRect);
        brushRect = null;
        if (activeTool === "select-area") {
          const selection = selectionEvent("end", rect, "keyboard");
          committedInterval = interactionConfig.select?.persistent
            ? selection
            : null;
          emitSelection(selection);
        } else applyBrushZoom(rect, "keyboard");
        reducer.dispatch({ type: "cancel-area" });
      }
      return;
    }
    if (event.key === "]" || event.key === "[") {
      event.preventDefault();
      cycleCoincident(event.key === "]" ? 1 : -1);
    } else if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      navigateDirection(
        event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0,
        event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0,
      );
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      activeTool === "point" &&
      inspection !== null
    ) {
      event.preventDefault();
      togglePointKeys(
        inspection.focus.key === null
          ? inspection.focus.sourceKeys
          : [inspection.focus.key],
        "keyboard",
      );
    } else if (
      (event.key === "Enter" || event.key === " ") &&
      inspection !== null &&
      interactionConfig.inspect?.pin
    ) {
      event.preventDefault();
      toggleInspectionPin("keyboard");
    } else if (event.key === "Escape") {
      event.preventDefault();
      const returnToInspect =
        brushRect === null &&
        (activeTool === "select-area" || activeTool === "zoom-area");
      reducer.dispatch({ type: "escape", source: "keyboard" });
      if (inspection !== null)
        emitInspection({ type: "inspect", phase: "clear", source: "keyboard" });
      inspection = null;
      inspectionSeed = null;
      tooltipHovered = false;
      inspectionCoordinator.invalidate();
      brushRect = null;
      if (returnToInspect) chooseTool("inspect");
    }
  }

  function onCaptureClick(event: MouseEvent): void {
    if (performance.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      return;
    }
    if (activeTool === "point" && interactionConfig.select?.type === "point") {
      const point = plotPoint(event);
      const match = model?.candidates.nearest(point.x, point.y, {
        mode: "xy",
        maxDistance: 24,
      });
      if (match === null || match === undefined) return;
      togglePointKeys(candidateSemanticKeys(match), "pointer");
      return;
    }
    if (
      activeTool !== "inspect" ||
      inspection === null ||
      !interactionConfig.inspect?.pin
    )
      return;
    toggleInspectionPin("pointer");
  }

  // Readiness signal for screenshot tooling (plan: VR waits on
  // `[data-gg-ready="true"]`). Effects run after the render flush; canvas
  // strata additionally gate on their first paint (decision 0006 / plan).
  let ready = $state(false);
  $effect(() => {
    ready =
      model !== null &&
      ((width !== undefined && width !== "container") ||
        containerHasPositiveWidth) &&
      (!hasCanvas ||
        (paintedFor === model.runId && paintedCount >= canvasCount));
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
  class:gg-narrow-tools={resolvedWidth < 560}
  class:gg-with-docked-tooltip={inspection?.state === "pinned" &&
    resolvedWidth < 480}
  data-gg-ready={ready ? "true" : "false"}
  style={rootStyle}
>
  {@render children?.()}
  {#if showToolRail}
    <div
      class="gg-tool-rail"
      role="toolbar"
      aria-label="Chart interaction tools"
      aria-busy={!ready}
    >
      <div class="gg-tool-modes">
        {#each availableTools as available (available)}
          <button
            type="button"
            disabled={!ready ||
              (emptyPlot &&
                (available === "select-area" || available === "zoom-area"))}
            class:active={activeTool === available}
            aria-pressed={activeTool === available}
            onclick={() => chooseTool(available)}
            >{available === "select-area"
              ? "Select area"
              : available === "zoom-area"
                ? "Zoom area"
                : available === "point"
                  ? "Select point"
                  : "Inspect"}</button
          >
        {/each}
      </div>
      <div class="gg-tool-recovery-actions">
        {#if effectiveZoomDomains !== null}
          <button type="button" onclick={() => resetZoom("pointer")}
            >Reset zoom</button
          >
        {/if}
        {#if effectiveSelectedKeys.length > 0}
          <button type="button" onclick={() => clearPointSelection("pointer")}
            >Clear selection</button
          >
        {/if}
        {#if committedInterval !== null}
          <button
            type="button"
            onclick={() => clearIntervalSelection("pointer")}
            >Clear selection</button
          >
        {/if}
      </div>
    </div>
  {/if}
  {#if model !== null}
    {#if hasCanvas}
      <SceneView scene={model.scene} mode="chrome-bottom" />
      {#each strata as stratum, si (si)}
        {#if stratum.backend === "canvas"}
          <canvas
            class="gg-stratum gg-canvas"
            {@attach canvasAttachment(model, stratum.batches)}
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
          />
        {/if}
      {/each}
      <SceneView scene={model.scene} mode="chrome-top" />
    {:else}
      <SceneView scene={model.scene} focusable={false} {markLabel} />
    {/if}
    {#if !interactive && emphasizedAnchors.length > 0}
      <svg
        class="gg-stratum gg-interaction-overlay"
        width={model.scene.width}
        height={model.scene.height}
        viewBox={`0 0 ${model.scene.width} ${model.scene.height}`}
        aria-hidden="true"
      >
        {#each emphasizedAnchors as anchor, index (index)}
          <circle
            class="gg-emphasized-ring"
            cx={anchor.x}
            cy={anchor.y}
            r="11"
            fill="none"
          />
        {/each}
      </svg>
    {/if}
    {#if interactive}
      <svg
        class="gg-stratum gg-interaction-overlay"
        width={model.scene.width}
        height={model.scene.height}
        viewBox={`0 0 ${model.scene.width} ${model.scene.height}`}
        aria-hidden="true"
      >
        {#if inspection !== null}
          {#if inspection.mode === "xy" || (inspection.mode === "x" && !coordFlipped) || (inspection.mode === "y" && coordFlipped)}
            {#if inspectionPanel}
              <line
                class="gg-crosshair"
                x1={inspection.focus.anchor.x}
                x2={inspection.focus.anchor.x}
                y1={inspectionPanel.y}
                y2={inspectionPanel.y + inspectionPanel.height}
              />
              {#if "axisLabel" in inspection}
                <text
                  class={`gg-crosshair-axis-label gg-crosshair-axis-label-${inspection.mode}`}
                  x={inspection.focus.anchor.x}
                  y={inspectionPanel.y + inspectionPanel.height - 4}
                  text-anchor="middle">{inspection.axisLabel}</text
                >
              {/if}
            {/if}
          {/if}
          {#if inspection.mode === "xy" || (inspection.mode === "y" && !coordFlipped) || (inspection.mode === "x" && coordFlipped)}
            {#if inspectionPanel}
              <line
                class="gg-crosshair"
                x1={inspectionPanel.x}
                x2={inspectionPanel.x + inspectionPanel.width}
                y1={inspection.focus.anchor.y}
                y2={inspection.focus.anchor.y}
              />
              {#if "axisLabel" in inspection}
                <text
                  class={`gg-crosshair-axis-label gg-crosshair-axis-label-${inspection.mode}`}
                  x={inspectionPanel.x + 4}
                  y={inspection.focus.anchor.y - 4}>{inspection.axisLabel}</text
                >
              {/if}
            {/if}
          {/if}
          <circle
            class="gg-hover-ring"
            cx={inspection.focus.anchor.x}
            cy={inspection.focus.anchor.y}
            r="6"
            fill="none"
          />
        {/if}
        {#each selectedAnchors as anchor, index (index)}
          <circle
            class="gg-selected-ring"
            cx={anchor.x}
            cy={anchor.y}
            r="8"
            fill="none"
          />
        {/each}
        {#each emphasizedAnchors as anchor, index (index)}
          <circle
            class="gg-emphasized-ring"
            cx={anchor.x}
            cy={anchor.y}
            r="11"
            fill="none"
          />
        {/each}
        {#if brushRect !== null}
          {@const r = normalizedRect(brushRect)}
          <rect
            class="gg-area-draft"
            class:gg-area-draft-select={activeTool === "select-area"}
            class:gg-area-draft-zoom={activeTool === "zoom-area"}
            x={r.x0}
            y={r.y0}
            width={r.x1 - r.x0}
            height={r.y1 - r.y0}
            fill={activeTool === "zoom-area"
              ? "none"
              : "var(--gg-selectionFill, var(--gg-theme-selectionFill, currentColor))"}
            fill-opacity={activeTool === "zoom-area" ? undefined : "0.12"}
            stroke="var(--gg-selectionStroke, var(--gg-theme-selectionStroke, currentColor))"
          />
          {#if activeTool === "zoom-area"}
            <text class="gg-zoom-label" x={r.x0 + 5} y={r.y0 + 15}>Zoom</text>
          {/if}
          {#if areaAwaitingSecond}
            <circle
              class="gg-first-corner"
              cx={brushRect.x0}
              cy={brushRect.y0}
              r="4"
              fill="var(--gg-selectionStroke, var(--gg-theme-selectionStroke, currentColor))"
            />
          {/if}
        {/if}
        {#if committedInterval !== null}
          <rect
            class="gg-selection"
            x={committedInterval.pixels.x0}
            y={committedInterval.pixels.y0}
            width={committedInterval.pixels.x1 - committedInterval.pixels.x0}
            height={committedInterval.pixels.y1 - committedInterval.pixels.y0}
            fill="var(--gg-selectionFill, var(--gg-theme-selectionFill, currentColor))"
            fill-opacity="0.08"
            stroke="var(--gg-selectionStroke, var(--gg-theme-selectionStroke, currentColor))"
          />
        {/if}
      </svg>
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

  .gg-with-docked-tooltip {
    margin-bottom: 260px;
  }

  /* Strata: full-size positioned siblings; document order = paint order
     (no z-index anywhere — decision 0006). All inert; the capture layer
     owns pointer events. */
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

  .gg-capture:focus-visible,
  .gg-tool-rail button:focus-visible {
    outline: 2px solid var(--gg-focusRing, var(--gg-theme-focusRing, Highlight));
    outline-offset: 2px;
  }

  .gg-crosshair {
    stroke: var(--gg-crosshair, var(--gg-theme-crosshair, currentColor));
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
    opacity: 0.55;
  }

  .gg-crosshair-axis-label {
    fill: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    font: 11px/1 var(--gg-font-family, sans-serif);
    paint-order: stroke;
    stroke: var(--gg-tooltipPaper, var(--gg-theme-tooltipPaper, white));
    stroke-width: 3px;
    stroke-linejoin: round;
  }

  .gg-hover-ring {
    stroke: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
  }

  .gg-selected-ring {
    stroke: var(
      --gg-selectionStroke,
      var(--gg-theme-selectionStroke, currentColor)
    );
    stroke-width: 2.5;
    vector-effect: non-scaling-stroke;
  }

  .gg-emphasized-ring {
    stroke: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    stroke-width: 2;
    stroke-dasharray: 3 2;
    vector-effect: non-scaling-stroke;
  }

  @media (forced-colors: active) {
    .gg-emphasized-ring {
      stroke: Highlight;
    }
  }

  .gg-tool-rail {
    position: absolute;
    left: 8px;
    right: 8px;
    top: -48px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px;
    align-items: center;
    z-index: 1;
    line-height: 1.2;
    pointer-events: auto;
  }

  .gg-tool-modes,
  .gg-tool-recovery-actions {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .gg-tool-rail button {
    min-height: 44px;
    min-width: 44px;
    border: 0;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    padding: 0 10px;
    background: transparent;
    color: var(
      --gg-interactionMuted,
      var(--gg-theme-interactionMuted, currentColor)
    );
    font: inherit;
    font-size: 14px;
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

  .gg-tool-rail button.active {
    border-bottom-color: var(
      --gg-toolActive,
      var(--gg-theme-toolActive, currentColor)
    );
    color: var(--gg-toolActive, var(--gg-theme-toolActive, currentColor));
  }

  .gg-tool-recovery-actions:empty {
    display: none;
  }

  .gg-area-draft,
  .gg-selection {
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
  }

  .gg-zoom-label {
    fill: var(
      --gg-interactionInk,
      var(--gg-theme-interactionInk, currentColor)
    );
    font: 10px/1 var(--gg-font-family, sans-serif);
    paint-order: stroke;
    stroke: var(--gg-tooltipPaper, var(--gg-theme-tooltipPaper, white));
    stroke-width: 3px;
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

    .gg-tool-rail {
      top: -92px;
      grid-template-columns: 1fr;
      grid-template-rows: auto auto;
    }

    .gg-tool-modes,
    .gg-tool-recovery-actions {
      width: 100%;
    }
  }

  /* ResizeObserver-backed fallback for engines that do not apply a query to
     descendants of a component-owned named container during hydration. */
  .gg-narrow-tools.gg-with-tool-rail {
    margin-top: 96px;
  }

  .gg-narrow-tools .gg-tool-rail {
    top: -92px;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
  }

  .gg-narrow-tools .gg-tool-modes,
  .gg-narrow-tools .gg-tool-recovery-actions {
    width: 100%;
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
    .gg-capture:focus-visible,
    .gg-tool-rail button:focus-visible {
      outline-color: Highlight;
    }

    .gg-tool-rail button.active {
      border-bottom-color: Highlight;
      color: ButtonText;
    }

    .gg-area-draft-select,
    .gg-selection {
      fill: none;
      stroke: Highlight;
    }

    .gg-area-draft-zoom {
      fill: none;
      stroke: CanvasText;
      stroke-width: 2;
    }

    .gg-crosshair,
    .gg-hover-ring,
    .gg-selected-ring {
      stroke: Highlight;
    }

    .gg-zoom-label {
      fill: CanvasText;
      stroke: Canvas;
    }
  }
</style>
