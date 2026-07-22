<script lang="ts">
  /**
   * One GeometryBatch (points / paths / areas / rects / segments / glyphs),
   * panel-local coordinates. Mirrors @ggsvelte/core's renderToSVGString batch
   * structure (same class names) — keep the two in sync. Theme defaults ride
   * --gg-* custom properties (ink for strokes/points/text, accent for fills).
   */
  import type {
    BatchInteractionMask,
    GeometryBatch,
    PointShape,
    ThemeTokens,
  } from "@ggsvelte/core";
  import { LINETYPE_DASHES, pathData, themeVar } from "@ggsvelte/core";
  import { LINETYPE_NAMES, POINT_SHAPE_NAMES } from "@ggsvelte/spec";

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
    /** Source row (null for synthesized marks). */
    row: number | null;
  }

  const points: Point[] = $derived.by(() => {
    if (batch.kind !== "points") return [];
    return Array.from({ length: batch.rowIndex.length }, (_, j) => ({
      index: j,
      x: batch.positions[j * 2]!,
      y: batch.positions[j * 2 + 1]!,
      fill: batch.colors?.[j] ?? batch.fill ?? ink,
      size: styleNumber(batch.sizes?.[j] ?? batch.size),
      alpha: styleNumber(batch.alphas?.[j] ?? 1),
      shape:
        batch.shapeIndexes === undefined
          ? batch.shape
          : POINT_SHAPE_NAMES[batch.shapeIndexes[j]!]!,
      row: batch.rowIndex[j] === NO_ROW ? null : batch.rowIndex[j]!,
    }));
  });

  interface Subpath {
    index: number;
    d: string;
    stroke: string;
    fill: string;
    linewidth: number;
    alpha: number;
    dasharray: string | undefined;
  }

  const subpaths: Subpath[] = $derived.by(() => {
    if (batch.kind !== "paths") return [];
    const isArea = batch.fills !== undefined;
    const out: Subpath[] = [];
    for (let s = 0; s < batch.pathOffsets.length - 1; s++) {
      const d = pathData(
        batch.positions,
        batch.pathOffsets[s]!,
        batch.pathOffsets[s + 1]!,
        batch.curve,
        batch.closed === true,
      );
      if (d === "") continue;
      const linetype =
        batch.linetypeIndexes === undefined
          ? (batch.linetype ?? "solid")
          : LINETYPE_NAMES[batch.linetypeIndexes[s]!]!;
      const dash = LINETYPE_DASHES[LINETYPE_NAMES.indexOf(linetype)] ?? [];
      out.push({
        index: s,
        d,
        stroke: isArea ? "none" : (batch.strokes[s] ?? ink),
        fill: isArea ? (batch.fills![s] ?? accent) : "none",
        linewidth: styleNumber(batch.linewidths?.[s] ?? batch.linewidth),
        alpha: styleNumber(batch.alphas?.[s] ?? 1),
        dasharray: dash.length === 0 ? undefined : dash.join(" "),
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
      const linetype =
        batch.linetypeIndexes === undefined
          ? (batch.linetype ?? "solid")
          : LINETYPE_NAMES[batch.linetypeIndexes[j]!]!;
      const dash = LINETYPE_DASHES[LINETYPE_NAMES.indexOf(linetype)] ?? [];
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
      dasharray: (() => {
        const linetype =
          batch.linetypeIndexes === undefined
            ? (batch.linetype ?? "solid")
            : LINETYPE_NAMES[batch.linetypeIndexes[j]!]!;
        const dash = LINETYPE_DASHES[LINETYPE_NAMES.indexOf(linetype)] ?? [];
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
      {#if p.shape === "square"}
        <rect
          class={`gg-shape-${p.shape}`}
          x={p.x - p.size}
          y={p.y - p.size}
          width={p.size * 2}
          height={p.size * 2}
          fill={p.fill}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else if p.shape === "triangle"}
        <path
          class={`gg-shape-${p.shape}`}
          d={`M${p.x} ${p.y - p.size * 1.2}L${p.x + p.size * 1.1} ${p.y + p.size * 0.9}L${p.x - p.size * 1.1} ${p.y + p.size * 0.9}Z`}
          fill={p.fill}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else if p.shape === "diamond"}
        <path
          class={`gg-shape-${p.shape}`}
          d={`M${p.x} ${p.y - p.size * 1.25}L${p.x + p.size} ${p.y}L${p.x} ${p.y + p.size * 1.25}L${p.x - p.size} ${p.y}Z`}
          fill={p.fill}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else if p.shape === "plus" || p.shape === "cross"}
        <path
          class={`gg-shape-${p.shape}`}
          d={p.shape === "plus"
            ? `M${p.x - p.size} ${p.y}H${p.x + p.size}M${p.x} ${p.y - p.size}V${p.y + p.size}`
            : `M${p.x - p.size * 0.75} ${p.y - p.size * 0.75}L${p.x + p.size * 0.75} ${p.y + p.size * 0.75}M${p.x + p.size * 0.75} ${p.y - p.size * 0.75}L${p.x - p.size * 0.75} ${p.y + p.size * 0.75}`}
          fill="none"
          stroke={p.fill}
          stroke-width={Math.max(1, p.size / 2)}
          opacity={itemOpacity(p.alpha, presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else}
        <circle
          class={`gg-shape-${p.shape}`}
          cx={p.x}
          cy={p.y}
          r={p.size}
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
        stroke-linejoin={p.stroke === "none" ? undefined : "round"}
        stroke-linecap={p.stroke === "none" ? undefined : "round"}
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
