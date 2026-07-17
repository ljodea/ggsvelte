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
    ThemeTokens,
  } from "@ggsvelte/core";
  import { pathData, themeVar } from "@ggsvelte/core";

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

  interface Point {
    index: number;
    x: number;
    y: number;
    fill: string;
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
      row: batch.rowIndex[j] === NO_ROW ? null : batch.rowIndex[j]!,
    }));
  });

  interface Subpath {
    index: number;
    d: string;
    stroke: string;
    fill: string;
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
      out.push(
        isArea
          ? { index: s, d, stroke: "none", fill: batch.fills![s] ?? accent }
          : { index: s, d, stroke: batch.strokes[s] ?? ink, fill: "none" },
      );
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
  }

  const rects: Rect[] = $derived.by(() => {
    if (batch.kind !== "rects") return [];
    const roleFill =
      batch.fillRole === "paper" ? themeVar("paper", theme) : accent;
    return Array.from({ length: batch.rects.length / 4 }, (_, j) => ({
      index: j,
      x: batch.rects[j * 4]!,
      y: batch.rects[j * 4 + 1]!,
      width: batch.rects[j * 4 + 2]!,
      height: batch.rects[j * 4 + 3]!,
      fill: batch.fills?.[j] ?? batch.fill ?? roleFill,
    }));
  });

  /** Rect outline (boxplot boxes): undefined = no outline. */
  const rectStroke: string | undefined = $derived.by(() => {
    if (batch.kind !== "rects") return void 0;
    if (batch.stroke === undefined) return void 0;
    return batch.stroke ?? ink;
  });

  interface Segment {
    index: number;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke: string;
  }

  const segments: Segment[] = $derived.by(() => {
    if (batch.kind !== "segments") return [];
    return Array.from({ length: batch.segments.length / 4 }, (_, j) => ({
      index: j,
      x1: batch.segments[j * 4]!,
      y1: batch.segments[j * 4 + 1]!,
      x2: batch.segments[j * 4 + 2]!,
      y2: batch.segments[j * 4 + 3]!,
      stroke: batch.strokes?.[j] ?? batch.stroke ?? ink,
    }));
  });

  interface Glyph {
    index: number;
    x: number;
    y: number;
    text: string;
    fill: string;
  }

  const glyphs: Glyph[] = $derived.by(() => {
    if (batch.kind !== "glyphs") return [];
    return batch.texts.map((text, j) => ({
      index: j,
      x: batch.positions[j * 2]!,
      y: batch.positions[j * 2 + 1]!,
      text,
      fill: batch.colors?.[j] ?? batch.color ?? ink,
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

  function focusOpacity(focused: boolean): number | undefined {
    return focusMask === null || focused ? undefined : theme.interactionMuted;
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
      {#if batch.shape === "square"}
        <rect
          x={p.x - batch.size}
          y={p.y - batch.size}
          width={batch.size * 2}
          height={batch.size * 2}
          fill={p.fill}
          opacity={focusOpacity(presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else if batch.shape === "triangle"}
        <path
          d={`M${p.x} ${p.y - batch.size * 1.2}L${p.x + batch.size * 1.1} ${p.y + batch.size * 0.9}L${p.x - batch.size * 1.1} ${p.y + batch.size * 0.9}Z`}
          fill={p.fill}
          opacity={focusOpacity(presented.focused)}
          data-gg-focused={focusMask === null ? undefined : presented.focused}
          {...focusAttrs}
        />
      {:else}
        <circle
          cx={p.x}
          cy={p.y}
          r={batch.size}
          fill={p.fill}
          opacity={focusOpacity(presented.focused)}
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
        stroke-width={p.stroke === "none" ? undefined : batch.linewidth}
        stroke-linejoin={p.stroke === "none" ? undefined : "round"}
        stroke-linecap={p.stroke === "none" ? undefined : "round"}
        opacity={focusOpacity(presented.focused)}
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
        stroke={rectStroke}
        stroke-width={rectStroke === undefined
          ? undefined
          : (batch.strokeWidth ?? 1)}
        opacity={focusOpacity(presented.focused)}
        data-gg-focused={focusMask === null ? undefined : presented.focused}
      />
    {/each}
  </g>
{:else if batch.kind === "segments"}
  <g class="gg-batch gg-segments" data-layer={batch.layerIndex} opacity={alpha}>
    {#each presentationOrder(segments) as presented (presented.item.index)}
      {@const s = presented.item}
      <line
        x1={s.x1}
        y1={s.y1}
        x2={s.x2}
        y2={s.y2}
        stroke={s.stroke}
        stroke-width={batch.linewidth}
        opacity={focusOpacity(presented.focused)}
        data-gg-focused={focusMask === null ? undefined : presented.focused}
      />
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
        opacity={focusOpacity(presented.focused)}
        data-gg-focused={focusMask === null ? undefined : presented.focused}
        >{glyph.text}</text
      >
    {/each}
  </g>
{/if}
