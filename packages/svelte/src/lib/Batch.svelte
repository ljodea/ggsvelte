<script lang="ts">
  /**
   * One GeometryBatch (points / paths / areas / rects / segments / glyphs),
   * panel-local coordinates. Mirrors @ggsvelte/core's renderToSVGString batch
   * structure (same class names) — keep the two in sync. Theme defaults ride
   * --gg-* custom properties (ink for strokes/points/text, accent for fills).
   */
  import type { GeometryBatch, ThemeTokens } from "@ggsvelte/core";
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
  }: {
    batch: GeometryBatch;
    theme: ThemeTokens;
    /** Make SVG point marks keyboard-focusable tooltip targets. */
    focusable?: boolean;
    /** Accessible name for one mark's source row. */
    markLabel?: ((row: number) => string) | undefined;
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
    x: number;
    y: number;
    fill: string;
    /** Source row (null for synthesized marks). */
    row: number | null;
  }

  const points: Point[] = $derived.by(() => {
    if (batch.kind !== "points") return [];
    return Array.from({ length: batch.rowIndex.length }, (_, j) => ({
      x: batch.positions[j * 2]!,
      y: batch.positions[j * 2 + 1]!,
      fill: batch.colors?.[j] ?? batch.fill ?? ink,
      row: batch.rowIndex[j] === NO_ROW ? null : batch.rowIndex[j]!,
    }));
  });

  interface Subpath {
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
          ? { d, stroke: "none", fill: batch.fills![s] ?? accent }
          : { d, stroke: batch.strokes[s] ?? ink, fill: "none" },
      );
    }
    return out;
  });

  interface Rect {
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
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stroke: string;
  }

  const segments: Segment[] = $derived.by(() => {
    if (batch.kind !== "segments") return [];
    return Array.from({ length: batch.segments.length / 4 }, (_, j) => ({
      x1: batch.segments[j * 4]!,
      y1: batch.segments[j * 4 + 1]!,
      x2: batch.segments[j * 4 + 2]!,
      y2: batch.segments[j * 4 + 3]!,
      stroke: batch.strokes?.[j] ?? batch.stroke ?? ink,
    }));
  });

  interface Glyph {
    x: number;
    y: number;
    text: string;
    fill: string;
  }

  const glyphs: Glyph[] = $derived.by(() => {
    if (batch.kind !== "glyphs") return [];
    return batch.texts.map((text, j) => ({
      x: batch.positions[j * 2]!,
      y: batch.positions[j * 2 + 1]!,
      text,
      fill: batch.colors?.[j] ?? batch.color ?? ink,
    }));
  });

  const alpha = $derived(batch.alpha === 1 ? undefined : batch.alpha);
</script>

{#if batch.kind === "points"}
  <g class="gg-batch gg-points" data-layer={batch.layerIndex} opacity={alpha}>
    {#each points as p, i (i)}
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
          {...focusAttrs}
        />
      {:else if batch.shape === "triangle"}
        <path
          d={`M${p.x} ${p.y - batch.size * 1.2}L${p.x + batch.size * 1.1} ${p.y + batch.size * 0.9}L${p.x - batch.size * 1.1} ${p.y + batch.size * 0.9}Z`}
          fill={p.fill}
          {...focusAttrs}
        />
      {:else}
        <circle
          cx={p.x}
          cy={p.y}
          r={batch.size}
          fill={p.fill}
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
    {#each subpaths as p, i (i)}
      <path
        d={p.d}
        fill={p.fill}
        stroke={p.stroke}
        stroke-width={p.stroke === "none" ? undefined : batch.linewidth}
        stroke-linejoin={p.stroke === "none" ? undefined : "round"}
        stroke-linecap={p.stroke === "none" ? undefined : "round"}
      />
    {/each}
  </g>
{:else if batch.kind === "rects"}
  <g class="gg-batch gg-rects" data-layer={batch.layerIndex} opacity={alpha}>
    {#each rects as r, i (i)}
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
      />
    {/each}
  </g>
{:else if batch.kind === "segments"}
  <g class="gg-batch gg-segments" data-layer={batch.layerIndex} opacity={alpha}>
    {#each segments as s, i (i)}
      <line
        x1={s.x1}
        y1={s.y1}
        x2={s.x2}
        y2={s.y2}
        stroke={s.stroke}
        stroke-width={batch.linewidth}
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
    {#each glyphs as glyph, i (i)}
      <text x={glyph.x} y={glyph.y} dy="0.32em" fill={glyph.fill}
        >{glyph.text}</text
      >
    {/each}
  </g>
{/if}
