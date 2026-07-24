<script lang="ts">
  /**
   * One GeometryBatch (points / paths / areas / rects / segments / glyphs),
   * panel-local coordinates. Paint/shape/dash resolve through @ggsvelte/core
   * mark-paint (shared with the SVG-string and canvas serializers). Theme
   * defaults ride --gg-* custom properties (ink for strokes/points/text,
   * accent for fills).
   */
  import type {
    BatchInteractionMask,
    GeometryBatch,
    PointShape,
    ThemeTokens,
  } from "@ggsvelte/core";
  import {
    linetypeDash,
    markLinetype,
    pathData,
    pointShapeGeometry,
    pointShapePathD,
    resolvePathMark,
    resolvePointMark,
    themeVar,
  } from "@ggsvelte/core";

  /** Keyboard-focus cap: point marks become focusable tooltip targets only
   *  up to this many marks per batch (a11y pass; beyond it, the canvas-style
   *  data-table strategy is the documented alternative). */
  const FOCUSABLE_LIMIT = 100;

  const {
    batch,
    theme,
    focusable = false,
    markLabel,
    focusMask = null,
  }: {
    batch: GeometryBatch;
    theme: ThemeTokens;
    /** Make SVG point marks keyboard-focusable tooltip targets. */
    focusable?: boolean;
    /** Accessible name for one mark's source row. */
    markLabel?: ((row: number) => string) | undefined;
    /** Semantic focus projected to renderer primitives for this batch. */
    focusMask?: BatchInteractionMask | null;
  } = $props();

  const NO_ROW = 0xffffffff;
  const pointsFocusable = $derived(
    focusable &&
      batch.kind === "points" &&
      batch.rowIndex.length <= FOCUSABLE_LIMIT,
  );

  const ink = $derived(themeVar("ink", theme));
  const accent = $derived(themeVar("accent", theme));
  const styleNumber = (value: number): number =>
    Math.round(value * 1_000_000) / 1_000_000;

  interface Point {
    index: number;
    x: number;
    y: number;
    fill: string;
    size: number;
    alpha: number;
    shape: PointShape;
    geometry: ReturnType<typeof resolvePointMark>["geometry"];
    /** Source row (null for synthesized marks). */
    row: number | null;
  }

  const points: Point[] = $derived.by(() => {
    if (batch.kind !== "points") return [];
    return Array.from({ length: batch.rowIndex.length }, (_, j) => {
      const style = resolvePointMark(batch, j, ink);
      const size = styleNumber(style.size);
      const x = batch.positions[j * 2]!;
      const y = batch.positions[j * 2 + 1]!;
      return {
        index: j,
        x,
        y,
        fill: style.fill,
        size,
        alpha: styleNumber(style.alpha),
        shape: style.shape,
        // Rebuild geometry with display-rounded size so path `d` matches prior SSR.
        geometry: pointShapeGeometry(style.shape, x, y, size),
        row: batch.rowIndex[j] === NO_ROW ? null : batch.rowIndex[j]!,
      };
    });
  });

  interface Subpath {
    index: number;
    d: string;
    stroke: string;
    fill: string;
    linewidth: number;
    alpha: number;
    dasharray: string | undefined;
    linecap: "butt" | "round" | "square";
    linejoin: "miter" | "round" | "bevel";
  }

  const subpaths: Subpath[] = $derived.by(() => {
    if (batch.kind !== "paths") return [];
    const out: Subpath[] = [];
    const themeColors = { ink, accent };
    for (let s = 0; s < batch.pathOffsets.length - 1; s++) {
      const d = pathData(
        batch.positions,
        batch.pathOffsets[s]!,
        batch.pathOffsets[s + 1]!,
        batch.curve,
        batch.closed === true,
      );
      if (d === "") continue;
      const style = resolvePathMark(batch, s, themeColors);
      out.push({
        index: s,
        d,
        stroke: style.stroke,
        fill: style.fill,
        linewidth: styleNumber(style.width),
        alpha: styleNumber(style.alpha),
        dasharray: style.dash.length === 0 ? undefined : style.dash.join(" "),
        linecap: style.linecap,
        linejoin: style.linejoin,
      });
    }
    return out;
  });

  interface Rect {
    index: number;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    /** Outline color when stroke is set; undefined = no outline. */
    stroke: string | undefined;
    alpha: number;
    dasharray: string | undefined;
  }

  const rects: Rect[] = $derived.by(() => {
    if (batch.kind !== "rects") return [];
    const roleFill =
      batch.fillRole === "paper" ? themeVar("paper", theme) : accent;
    return Array.from({ length: batch.rects.length / 4 }, (_, j) => {
      const dash = linetypeDash(markLinetype(batch, j));
      const stroke =
        batch.strokes?.[j] ??
        (batch.stroke === undefined && batch.strokes === undefined
          ? undefined
          : (batch.stroke ?? ink));
      return {
        index: j,
        x: batch.rects[j * 4]!,
        y: batch.rects[j * 4 + 1]!,
        width: batch.rects[j * 4 + 2]!,
        height: batch.rects[j * 4 + 3]!,
        fill: batch.fills?.[j] ?? batch.fill ?? roleFill,
        stroke,
        alpha: styleNumber(batch.alphas?.[j] ?? 1),
        dasharray: dash.length === 0 ? undefined : dash.join(" "),
      };
    });
  });

  interface Segment {
    index: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    d?: string;
    stroke: string;
    linewidth: number;
    alpha: number;
    dasharray: string | undefined;
    /** Present only when the batch opts in (segment geom); omitted for rule. */
    linecap?: "butt" | "round" | "square";
  }

  const segments: Segment[] = $derived.by(() => {
    if (batch.kind !== "segments") return [];
    return Array.from({ length: batch.segments.length / 4 }, (_, j) => ({
      index: j,
      x1: batch.segments[j * 4]!,
      y1: batch.segments[j * 4 + 1]!,
      x2: batch.segments[j * 4 + 2]!,
      y2: batch.segments[j * 4 + 3]!,
      ...(batch.renderPositions !== undefined &&
        batch.renderPathOffsets !== undefined && {
          d: pathData(
            batch.renderPositions,
            batch.renderPathOffsets[j]!,
            batch.renderPathOffsets[j + 1]!,
            "linear",
          ),
        }),
      stroke: batch.strokes?.[j] ?? batch.stroke ?? ink,
      linewidth: styleNumber(batch.linewidths?.[j] ?? batch.linewidth),
      alpha: styleNumber(batch.alphas?.[j] ?? 1),
      // Conditional: only set when the batch opts in (rule batches leave undefined).
      ...(batch.linecap !== undefined && { linecap: batch.linecap }),
      dasharray: (() => {
        const dash = linetypeDash(markLinetype(batch, j));
        return dash.length === 0 ? undefined : dash.join(" ");
      })(),
    }));
  });

  interface Glyph {
    index: number;
    x: number;
    y: number;
    text: string;
    fill: string;
    size: number;
    alpha: number;
  }

  const glyphs: Glyph[] = $derived.by(() => {
    if (batch.kind !== "glyphs") return [];
    return batch.texts.map((text, j) => ({
      index: j,
      x: batch.positions[j * 2]!,
      y: batch.positions[j * 2 + 1]!,
      text,
      fill: batch.colors?.[j] ?? batch.color ?? ink,
      size: styleNumber(batch.sizes?.[j] ?? batch.size),
      alpha: styleNumber(batch.alphas?.[j] ?? 1),
    }));
  });

  const alpha = $derived(batch.alpha === 1 ? undefined : batch.alpha);

  interface Presented<T extends { index: number }> {
    item: T;
    focused: boolean;
  }

  function presentationOrder<T extends { index: number }>(
    items: T[],
  ): Presented<T>[] {
    if (focusMask === null)
      return items.map((item) => ({ item, focused: true }));
    const presented = items.map((item) => ({
      item,
      focused: focusMask.isFocused(item.index),
    }));
    return [
      ...presented.filter((item) => !item.focused),
      ...presented.filter((item) => item.focused),
    ];
  }

  function itemOpacity(mapped: number, focused: boolean): number | undefined {
    const opacity =
      focusMask === null || focused ? mapped : mapped * theme.interactionMuted;
    return opacity === 1 ? undefined : opacity;
  }
</script>

{#if batch.kind === "points"}
  <g class="gg-batch gg-points" data-layer={batch.layerIndex} opacity={alpha}>
    {#each presentationOrder(points) as presented (presented.item.index)}
      {@const p = presented.item}
      {@const focusAttrs =
        pointsFocusable && p.row !== null
          ? {
              tabindex: 0,
              role: "img",
              "aria-label": markLabel?.(p.row) ?? `data point ${p.row + 1}`,
              "data-gg-layer": batch.layerIndex,
              "data-gg-row": p.row,
            }
          : {}}
      {#if p.geometry.kind === "rect"}
        <rect
          class={`gg-shape-${p.shape}`}
          x={p.geometry.x}
          y={p.geometry.y}
          width={p.geometry.width}
          height={p.geometry.height}
          fill={p.fill}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else if p.geometry.kind === "polygon"}
        <path
          class={`gg-shape-${p.shape}`}
          d={pointShapePathD(p.geometry)}
          fill={p.fill}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else if p.geometry.kind === "lines"}
        <path
          class={`gg-shape-${p.shape}`}
          d={pointShapePathD(p.geometry)}
          fill="none"
          stroke={p.fill}
          stroke-width={p.geometry.strokeWidth}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else}
        <circle
          class={`gg-shape-${p.shape}`}
          cx={p.geometry.cx}
          cy={p.geometry.cy}
          r={p.geometry.r}
          fill={p.fill}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {/if}
    {/each}
  </g>
{:else if batch.kind === "paths"}
  <g
    class={`gg-batch ${batch.fills !== undefined ? "gg-areas" : "gg-paths"}`}
    data-layer={batch.layerIndex}
    opacity={alpha}
  >
    {#each presentationOrder(subpaths) as presented (presented.item.index)}
      {@const p = presented.item}
      <path
        d={p.d}
        fill={p.fill}
        stroke={p.stroke}
        stroke-width={p.stroke === "none" ? undefined : p.linewidth}
        stroke-dasharray={p.stroke === "none" ? undefined : p.dasharray}
        stroke-linejoin={p.stroke === "none" ? undefined : p.linejoin}
        stroke-linecap={p.stroke === "none" ? undefined : p.linecap}
        opacity={itemOpacity(p.alpha, presented.focused)}
        data-gg-focused={focusMask === null ? undefined : presented.focused}
      />
    {/each}
  </g>
{:else if batch.kind === "rects"}
  <g class="gg-batch gg-rects" data-layer={batch.layerIndex} opacity={alpha}>
    {#each presentationOrder(rects) as presented (presented.item.index)}
      {@const r = presented.item}
      <rect
        x={r.x}
        y={r.y}
        width={r.width}
        height={r.height}
        fill={r.fill}
        stroke={r.stroke}
        stroke-width={r.stroke === undefined
          ? undefined
          : (batch.strokeWidths?.[r.index] ?? batch.strokeWidth ?? 1)}
        stroke-dasharray={r.stroke === undefined ? undefined : r.dasharray}
        opacity={itemOpacity(r.alpha, presented.focused)}
        data-gg-focused={focusMask === null ? undefined : presented.focused}
      />
    {/each}
  </g>
{:else if batch.kind === "segments"}
  <g class="gg-batch gg-segments" data-layer={batch.layerIndex} opacity={alpha}>
    {#each presentationOrder(segments) as presented (presented.item.index)}
      {@const s = presented.item}
      {#if s.d !== undefined}
        <path
          d={s.d}
          fill="none"
          stroke={s.stroke}
          stroke-width={s.linewidth}
          stroke-dasharray={s.dasharray}
          stroke-linecap={s.linecap}
          opacity={itemOpacity(s.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
        />
      {:else}
        <line
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={s.stroke}
          stroke-width={s.linewidth}
          stroke-dasharray={s.dasharray}
          stroke-linecap={s.linecap}
          opacity={itemOpacity(s.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
        />
      {/if}
    {/each}
  </g>
{:else if batch.kind === "glyphs"}
  <g
    class="gg-batch gg-glyphs"
    data-layer={batch.layerIndex}
    font-size={batch.size}
    text-anchor={batch.anchor}
    opacity={alpha}
  >
    {#each presentationOrder(glyphs) as presented (presented.item.index)}
      {@const glyph = presented.item}
      <text
        x={glyph.x}
        y={glyph.y}
        dy="0.32em"
        fill={glyph.fill}
        font-size={glyph.size}
        opacity={itemOpacity(glyph.alpha, presented.focused)}
        data-gg-focused={focusMask === null ? undefined : presented.focused}
        >{glyph.text}</text
      >
    {/each}
  </g>
{/if}

<style>
  /* Ease interaction-mask opacity changes (legend emphasis, muteSiblings, etc.).
     Transition on direct mark children — not only [data-gg-focused] — so unmute
     on mask clear still eases. Default-off mute (#633) avoids gap flicker; this
     softens remaining mask transitions. Instant under prefers-reduced-motion. */
  /* svelte-ignore css_unused_selector */
  .gg-batch > :global(*) {
    transition: opacity 120ms ease;
  }

  @media (prefers-reduced-motion: reduce) {
    /* svelte-ignore css_unused_selector */
    .gg-batch > :global(*) {
      transition: none;
    }
  }
</style>
