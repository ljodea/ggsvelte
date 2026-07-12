<script lang="ts">
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

  import type {
    BrushSelection,
    TooltipContext,
    ZoomDomains,
  } from "./interaction.js";
  import type { LayerDescriptor } from "./registry.svelte.js";
  import { provideRegistry } from "./registry.svelte.js";
  import SceneView from "./SceneView.svelte";
  import Tooltip from "./Tooltip.svelte";

  interface Props {
    /** A complete spec (bare-string channel shorthand allowed). Wins over the other props. */
    spec?: SpecInput;
    /** Data rows, columns, or a DataRef ({values}/{columns}/{name}). */
    data?: DataInput;
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
    /** Plot width in px, or "container" (ResizeObserver-driven, debounced
     *  through run ids). Falls back to spec.width, then 640. */
    width?: number | "container";
    /** Plot height in px (falls back to spec.height, then 400). */
    height?: number;
    /** Show a hover tooltip: true for the default field/value list, or a
     *  snippet receiving the TooltipContext. */
    tooltip?: boolean | Snippet<[TooltipContext]>;
    /** Called with the hovered mark (null when the pointer leaves marks). */
    onhover?: (hit: SceneHit | null) => void;
    /** Enable the transient rectangle brush (selection overlay). */
    brush?: boolean;
    /** Called with the finished selection (null when the brush clears). */
    onbrush?: (selection: BrushSelection | null) => void;
    /** Brush-to-zoom: a finished brush respecs explicit continuous domains
     *  (colors never shift — prevScales flow); double-click resets. Implies
     *  brush. Single-panel plots only (facets: documented limitation). */
    zoom?: boolean;
    /** Called when the zoom domains change (null on reset). */
    onzoom?: (domains: ZoomDomains | null) => void;
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
    tooltip = false,
    onhover,
    brush = false,
    onbrush,
    zoom = false,
    onzoom,
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
    let builder = gg(data, mapping);
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

  // ------------------------------------------------------------ zoom respec
  let zoomDomains = $state<ZoomDomains | null>(null);

  const zoomScale = (config: Scales["x"], domain: [number, number]) => ({
    ...config,
    domain: [domain[0], domain[1]],
    nice: false,
  });

  const effectiveSpec: PortableSpec | null = $derived.by(() => {
    if (assembled === null || zoomDomains === null) return assembled;
    return {
      ...assembled,
      scales: {
        ...assembled.scales,
        ...(zoomDomains.x !== undefined && {
          x: zoomScale(assembled.scales?.x, zoomDomains.x),
        }),
        ...(zoomDomains.y !== undefined && {
          y: zoomScale(assembled.scales?.y, zoomDomains.y),
        }),
      },
    };
  });

  // ------------------------------------------------- container width (RO)
  let containerWidth = $state<number | null>(null);
  let root = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (width !== "container" || root === null) return;
    const el = root;
    let frame = 0;
    const observer = new ResizeObserver((entries) => {
      // Debounce resize storms through rAF; the pipeline's run-id gate
      // guarantees only the newest result commits regardless.
      const nextWidth = Math.round(entries[0]?.contentRect.width ?? 0);
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
    width === "container"
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
    zoomDomains = null;
    scaleEpoch++;
  }

  // Memory ownership: dispose the previous model once the DOM has moved on
  // (effect cleanup runs post-flush), and the last model on unmount.
  $effect(() => {
    const m = model;
    return () => m?.dispose();
  });

  $effect(() => {
    if (model !== null && assembled !== null) onrender?.(model, assembled);
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
  const tooltipEnabled = $derived(tooltip !== false);
  const tooltipContent = $derived(
    typeof tooltip === "function" ? tooltip : undefined,
  );
  const brushEnabled = $derived(brush || zoom);
  const interactive = $derived(
    tooltipEnabled || brushEnabled || onhover !== undefined,
  );

  const hitIndex: SceneHitIndex | null = $derived.by(() =>
    interactive && model !== null ? buildHitIndex(model.scene) : null,
  );

  let hover = $state<SceneHit | null>(null);
  let brushRect = $state<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  } | null>(null);
  let brushing = false; // transient pointer state, never reactive

  function plotPoint(event: PointerEvent | MouseEvent): {
    x: number;
    y: number;
  } {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function setHover(hit: SceneHit | null): void {
    const changed =
      (hover === null) !== (hit === null) ||
      (hover !== null &&
        hit !== null &&
        (hover.layerIndex !== hit.layerIndex ||
          hover.rowIndex !== hit.rowIndex));
    hover = hit;
    if (changed) onhover?.(hit);
  }

  function onPointerMove(event: PointerEvent): void {
    const p = plotPoint(event);
    if (brushing && brushRect !== null) {
      brushRect = { ...brushRect, x1: p.x, y1: p.y };
      return;
    }
    setHover(hitIndex?.hitTest(p.x, p.y) ?? null);
  }

  function onPointerLeave(): void {
    if (!brushing) setHover(null);
  }

  function onPointerDown(event: PointerEvent): void {
    if (!brushEnabled || event.button !== 0) return;
    const p = plotPoint(event);
    brushing = true;
    brushRect = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    setHover(null);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function onPointerUp(event: PointerEvent): void {
    if (!brushing || brushRect === null) return;
    brushing = false;
    const p = plotPoint(event);
    const rect = normalizedRect({ ...brushRect, x1: p.x, y1: p.y });
    brushRect = null;
    // Sub-4px drags are clicks, not selections.
    if (rect.x1 - rect.x0 < 4 && rect.y1 - rect.y0 < 4) {
      onbrush?.(null);
      return;
    }
    if (hitIndex !== null) {
      const hits = hitIndex.queryRect(rect.x0, rect.y0, rect.x1, rect.y1);
      onbrush?.({
        ...rect,
        hits,
        rows: hits
          .map((h) => h.rowIndex)
          .filter((r): r is number => r !== null),
      });
    }
    if (zoom) applyBrushZoom(rect);
  }

  function onDblClick(): void {
    if (!zoom || zoomDomains === null) return;
    zoomDomains = null;
    onzoom?.(null);
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
  function applyBrushZoom(rect: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }): void {
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
    const next: ZoomDomains = { ...zoomDomains };
    const hDomain = invertedDomain(hScale, th0, th1);
    const vDomain = invertedDomain(vScale, tv0, tv1);
    if (hDomain !== undefined) next[flip ? "y" : "x"] = hDomain;
    if (vDomain !== undefined) next[flip ? "x" : "y"] = vDomain;
    if (next.x === undefined && next.y === undefined) return;
    zoomDomains = next;
    onzoom?.(next);
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

  // Keyboard focus on SVG marks shows the tooltip (a11y pass).
  function onFocusIn(event: FocusEvent): void {
    const target = event.target as HTMLElement;
    const rowAttr = target.dataset?.["ggRow"];
    const layerAttr = target.dataset?.["ggLayer"];
    if (rowAttr === undefined || layerAttr === undefined || root === null)
      return;
    const markRect = target.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    setHover({
      layerIndex: Number(layerAttr),
      panelIndex: 0,
      rowIndex: Number(rowAttr),
      x: markRect.left - rootRect.left + markRect.width / 2,
      y: markRect.top - rootRect.top + markRect.height / 2,
      kind: "points",
    });
  }

  function onFocusOut(): void {
    setHover(null);
  }

  // Readiness signal for screenshot tooling (plan: VR waits on
  // `[data-gg-ready="true"]`). Effects run after the render flush; canvas
  // strata additionally gate on their first paint (decision 0006 / plan).
  let ready = $state(false);
  $effect(() => {
    ready =
      model !== null &&
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
  class:gg-container-width={width === "container"}
  data-gg-ready={ready ? "true" : "false"}
  style={hasCanvas || interactive
    ? `width:${model?.scene.width ?? resolvedWidth}px;height:${model?.scene.height ?? resolvedHeight}px`
    : undefined}
  onfocusin={interactive ? onFocusIn : undefined}
  onfocusout={interactive ? onFocusOut : undefined}
>
  {@render children?.()}
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
            focusable={tooltipEnabled}
            {markLabel}
          />
        {/if}
      {/each}
      <SceneView scene={model.scene} mode="chrome-top" />
    {:else}
      <SceneView scene={model.scene} focusable={tooltipEnabled} {markLabel} />
    {/if}
    {#if interactive}
      <svg
        class="gg-stratum gg-interaction-overlay"
        width={model.scene.width}
        height={model.scene.height}
        viewBox={`0 0 ${model.scene.width} ${model.scene.height}`}
        aria-hidden="true"
      >
        {#if hover !== null}
          <circle
            class="gg-hover-ring"
            cx={hover.x}
            cy={hover.y}
            r="6"
            fill="none"
            stroke="var(--gg-ink, currentColor)"
            stroke-width="1.5"
          />
        {/if}
        {#if brushRect !== null}
          {@const r = normalizedRect(brushRect)}
          <rect
            class="gg-brush"
            x={r.x0}
            y={r.y0}
            width={r.x1 - r.x0}
            height={r.y1 - r.y0}
            fill="var(--gg-ink, currentColor)"
            fill-opacity="0.08"
            stroke="var(--gg-ink, currentColor)"
            stroke-dasharray="4 3"
          />
        {/if}
      </svg>
      <!-- The capture layer is a pointer-only surface; the accessible
           interaction paths are focusable marks and the data table. -->
      <div
        class="gg-capture"
        role="presentation"
        aria-hidden="true"
        onpointermove={onPointerMove}
        onpointerleave={onPointerLeave}
        onpointerdown={onPointerDown}
        onpointerup={onPointerUp}
        ondblclick={onDblClick}
      ></div>
      {#if tooltipEnabled && hover !== null}
        <Tooltip hit={hover} {model} content={tooltipContent} />
      {/if}
    {/if}
  {/if}
</div>

<style>
  .gg-plot-root {
    position: relative;
    display: inline-block;
    line-height: 0;
  }

  .gg-container-width {
    display: block;
    width: 100%;
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
    touch-action: none;
    background: transparent;
  }
</style>
