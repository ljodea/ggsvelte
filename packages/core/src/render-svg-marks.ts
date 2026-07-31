/**
 * Mark/batch SVG emitters for the pure renderer.
 * Public: countMarks, pathData. Internal: renderBatch.
 */
import { renderPrimitiveCount } from "./candidate-geometry.js";
import { type ResolvedGlow, type ResolvedGradientPaint } from "./mark-paint.js";
import {
  pointShapeGeometry,
  pointShapePathD,
  resolveGlyphMark,
  resolvePathMark,
  resolvePointMark,
  resolveRectMark,
  resolveSegmentMark,
} from "./mark-style.js";
import type {
  GlyphsBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  Scene,
  SegmentsBatch,
} from "./scene.js";
import type { PointShape } from "./scales/style.js";
import type { ThemeTokens } from "./theme.js";
import { themeVar } from "./theme.js";
import { stepCorners } from "./path-step.js";
import { escapeXML, px } from "./render-svg-format.js";

/** When true, use solid paint fallbacks and skip glow filters. */
export type PaintRenderMode = "full" | "fallback";

function paintFill(
  solid: string,
  paint: ResolvedGradientPaint | undefined,
  mode: PaintRenderMode,
): string {
  if (paint === undefined || mode === "fallback") return solid;
  return `url(#${paint.id})`;
}

function paintStroke(
  solid: string,
  paint: ResolvedGradientPaint | undefined,
  mode: PaintRenderMode,
): string {
  if (paint === undefined || mode === "fallback") return solid;
  return `url(#${paint.id})`;
}

function glowAttr(glow: ResolvedGlow | undefined, mode: PaintRenderMode): string {
  if (glow === undefined || mode === "fallback") return "";
  return ` filter="url(#${glow.id})"`;
}

export function countMarks(scene: Scene): number {
  let marks = 0;
  for (const batch of scene.batches) marks += renderPrimitiveCount(batch);
  return marks;
}

export function pointShape(
  shape: PointShape,
  x: number,
  y: number,
  size: number,
  fill: string,
): string {
  const className = `gg-shape-${shape}`;
  const geometry = pointShapeGeometry(shape, x, y, size);
  switch (geometry.kind) {
    case "rect":
      return `<rect class="${className}" x="${px(geometry.x)}" y="${px(geometry.y)}" width="${px(geometry.width)}" height="${px(geometry.height)}" fill="${fill}"/>`;
    case "polygon":
      return `<path class="${className}" d="${pointShapePathD(geometry, px)}" fill="${fill}"/>`;
    case "lines":
      return `<path class="${className}" d="${pointShapePathD(geometry, px)}" fill="none" stroke="${fill}" stroke-width="${px(geometry.strokeWidth)}"/>`;
    case "circle":
      return `<circle class="${className}" cx="${px(geometry.cx)}" cy="${px(geometry.cy)}" r="${px(geometry.r)}" fill="${fill}"/>`;
    default: {
      const exhaustive: never = geometry;
      throw new Error(`unknown point shape geometry: ${JSON.stringify(exhaustive)}`);
    }
  }
}

function alphaAttr(alpha: number): string {
  return alpha === 1 ? "" : ` opacity="${px(alpha)}"`;
}

function renderPoints(batch: PointsBatch, theme: ThemeTokens): string {
  const parts: string[] = [
    `<g class="gg-batch gg-points" data-layer="${batch.layerIndex}"${alphaAttr(batch.alpha)}>`,
  ];
  const n = batch.rowIndex.length;
  const themeInk = themeVar("ink", theme);
  for (let j = 0; j < n; j++) {
    const style = resolvePointMark(batch, j, themeInk);
    const opacity = batch.alphas === undefined ? "" : alphaAttr(style.alpha);
    const mark = pointShape(
      style.shape,
      batch.positions[j * 2]!,
      batch.positions[j * 2 + 1]!,
      style.size,
      style.fill,
    );
    parts.push(opacity === "" ? mark : mark.replace("/>", `${opacity}/>`));
  }
  parts.push("</g>");
  return parts.join("");
}

/** Path data for one closed/open ring span (step-hv / step-vh / step-mid bends). */
function pathRingData(
  positions: Float32Array,
  start: number,
  end: number,
  curve: PathsBatch["curve"],
  closed: boolean,
): string {
  if (end <= start) return "";
  const parts: string[] = [`M${px(positions[start * 2]!)} ${px(positions[start * 2 + 1]!)}`];
  for (let j = start + 1; j < end; j++) {
    const x = positions[j * 2]!;
    const y = positions[j * 2 + 1]!;
    if (curve === "step" || curve === "step-hv" || curve === "step-vh") {
      const prevX = positions[(j - 1) * 2]!;
      const prevY = positions[(j - 1) * 2 + 1]!;
      for (const c of stepCorners(prevX, prevY, x, y, curve)) {
        parts.push(`L${px(c.x)} ${px(c.y)}`);
      }
    }
    parts.push(`L${px(x)} ${px(y)}`);
  }
  if (closed) parts.push("Z");
  return parts.join("");
}

/**
 * Path data for one subpath. When `ringStarts` lists interior ring starts inside
 * [start, end), emits multiple M…Z rings for even-odd polygon holes.
 */
export function pathData(
  positions: Float32Array,
  start: number,
  end: number,
  curve: PathsBatch["curve"],
  closed = false,
  ringStarts?: ArrayLike<number>,
): string {
  if (end <= start) return "";
  if (ringStarts === undefined || ringStarts.length === 0 || !closed) {
    return pathRingData(positions, start, end, curve, closed);
  }
  const cuts: number[] = [start];
  for (let i = 0; i < ringStarts.length; i++) {
    const b = ringStarts[i]!;
    if (b > start && b < end) cuts.push(b);
  }
  cuts.push(end);
  const parts: string[] = [];
  for (let i = 0; i + 1 < cuts.length; i++) {
    const d = pathRingData(positions, cuts[i]!, cuts[i + 1]!, curve, true);
    if (d !== "") parts.push(d);
  }
  return parts.join("");
}

function dashAttrFromDash(dash: readonly number[]): string {
  return dash.length === 0 ? "" : ` stroke-dasharray="${dash.join(" ")}"`;
}

function renderPaths(
  batch: PathsBatch,
  theme: ThemeTokens,
  mode: PaintRenderMode = "full",
): string {
  const isArea = batch.fills !== undefined;
  const parts: string[] = [
    `<g class="gg-batch ${isArea ? "gg-areas" : "gg-paths"}" data-layer="${batch.layerIndex}"${alphaAttr(batch.alpha)}${glowAttr(batch.glow, mode)}>`,
  ];
  const themeColors = { ink: themeVar("ink", theme), accent: themeVar("accent", theme) };
  const subpaths = batch.pathOffsets.length - 1;
  const fillRuleAttr =
    batch.fillRule === "evenodd"
      ? ' fill-rule="evenodd"'
      : batch.fillRule === "nonzero"
        ? ' fill-rule="nonzero"'
        : "";
  for (let s = 0; s < subpaths; s++) {
    const d = pathData(
      batch.positions,
      batch.pathOffsets[s]!,
      batch.pathOffsets[s + 1]!,
      batch.curve,
      batch.closed === true,
      batch.ringStarts,
    );
    if (d === "") continue;
    const style = resolvePathMark(batch, s, themeColors);
    const alpha = batch.alphas?.[s];
    if (isArea) {
      const fill = paintFill(
        style.fill === "none" ? themeColors.accent : style.fill,
        batch.fillPaint,
        mode,
      );
      if (style.stroke === "none") {
        parts.push(
          `<path d="${d}" fill="${fill}" stroke="none"${fillRuleAttr}${alpha === undefined ? "" : alphaAttr(alpha)}/>`,
        );
      } else {
        const stroke = paintStroke(style.stroke, batch.strokePaint, mode);
        parts.push(
          `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${px(style.width)}"${dashAttrFromDash(style.dash)}${fillRuleAttr}${alpha === undefined ? "" : alphaAttr(alpha)} stroke-linejoin="${style.linejoin}" stroke-linecap="${style.linecap}"/>`,
        );
      }
    } else {
      const stroke = paintStroke(
        style.stroke === "none" ? themeColors.ink : style.stroke,
        batch.strokePaint,
        mode,
      );
      parts.push(
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${px(style.width)}"${dashAttrFromDash(style.dash)}${alpha === undefined ? "" : alphaAttr(alpha)} stroke-linejoin="${style.linejoin}" stroke-linecap="${style.linecap}"/>`,
      );
    }
  }
  parts.push("</g>");
  return parts.join("");
}

function renderRects(batch: RectsBatch, theme: ThemeTokens): string {
  const parts: string[] = [
    `<g class="gg-batch gg-rects" data-layer="${batch.layerIndex}"${alphaAttr(batch.alpha)}>`,
  ];
  const n = batch.rects.length / 4;
  const themeColors = {
    accent: themeVar("accent", theme),
    paper: themeVar("paper", theme),
    ink: themeVar("ink", theme),
  };
  for (let j = 0; j < n; j++) {
    const style = resolveRectMark(batch, j, themeColors);
    const strokeAttr =
      style.stroke === undefined
        ? ""
        : ` stroke="${style.stroke}" stroke-width="${px(style.strokeWidth)}"${dashAttrFromDash(style.dash)}`;
    const opacity = batch.alphas === undefined ? "" : alphaAttr(style.alpha);
    parts.push(
      `<rect x="${px(batch.rects[j * 4]!)}" y="${px(batch.rects[j * 4 + 1]!)}" width="${px(batch.rects[j * 4 + 2]!)}" height="${px(batch.rects[j * 4 + 3]!)}" fill="${style.fill}"${strokeAttr}${opacity}/>`,
    );
  }
  parts.push("</g>");
  return parts.join("");
}

function renderSegments(
  batch: SegmentsBatch,
  theme: ThemeTokens,
  mode: PaintRenderMode = "full",
): string {
  const parts: string[] = [
    `<g class="gg-batch gg-segments" data-layer="${batch.layerIndex}"${alphaAttr(batch.alpha)}${glowAttr(batch.glow, mode)}>`,
  ];
  const n = batch.segments.length / 4;
  const themeInk = themeVar("ink", theme);
  for (let j = 0; j < n; j++) {
    const mark = resolveSegmentMark(batch, j, themeInk);
    const stroke = paintStroke(mark.stroke, batch.strokePaint, mode);
    const linewidth = mark.width;
    const linecap = mark.linecap === undefined ? "" : ` stroke-linecap="${mark.linecap}"`;
    const style = `${dashAttrFromDash(mark.dash)}${batch.alphas === undefined ? "" : alphaAttr(mark.alpha)}${linecap}`;
    if (batch.renderPositions !== undefined && batch.renderPathOffsets !== undefined) {
      const d = pathData(
        batch.renderPositions,
        batch.renderPathOffsets[j]!,
        batch.renderPathOffsets[j + 1]!,
        "linear",
      );
      parts.push(
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${px(linewidth)}"${style}/>`,
      );
    } else {
      parts.push(
        `<line x1="${px(batch.segments[j * 4]!)}" y1="${px(batch.segments[j * 4 + 1]!)}" x2="${px(batch.segments[j * 4 + 2]!)}" y2="${px(batch.segments[j * 4 + 3]!)}" stroke="${stroke}" stroke-width="${px(linewidth)}"${style}/>`,
      );
    }
  }
  parts.push("</g>");
  return parts.join("");
}

/** Panel-local box origin for a glyph anchor + box size (geom_label / sf_label). */
export function labelBoxOrigin(
  x: number,
  y: number,
  width: number,
  height: number,
  anchor: "start" | "middle" | "end",
  padding: number,
): { x: number; y: number } {
  let left = x - width / 2;
  if (anchor === "start") left = x - padding;
  else if (anchor === "end") left = x - width + padding;
  return { x: left, y: y - height / 2 };
}

function renderGlyphs(batch: GlyphsBatch, theme: ThemeTokens): string {
  const parts: string[] = [
    `<g class="gg-batch gg-glyphs" data-layer="${batch.layerIndex}" font-size="${px(batch.size)}" text-anchor="${batch.anchor}"${alphaAttr(batch.alpha)}>`,
  ];
  const n = batch.texts.length;
  const themeInk = themeVar("ink", theme);
  const themePaper = themeVar("paper", theme);
  // Measured extents alone do not paint a label box (geom_text measures for
  // inspect hover/hit). Visual chrome is geom_label / sf_label only.
  const hasBox =
    batch.boxWidths !== undefined &&
    batch.boxHeights !== undefined &&
    (batch.boxRadius !== undefined ||
      batch.boxFill !== undefined ||
      batch.boxFills !== undefined ||
      batch.boxStroke !== undefined ||
      batch.boxStrokes !== undefined);
  for (let j = 0; j < n; j++) {
    const mark = resolveGlyphMark(batch, j, themeInk);
    const size = batch.sizes === undefined ? undefined : mark.size;
    const alpha = batch.alphas === undefined ? undefined : mark.alpha;
    const tx = batch.positions[j * 2]!;
    const ty = batch.positions[j * 2 + 1]!;
    if (hasBox) {
      const bw = batch.boxWidths![j]!;
      const bh = batch.boxHeights![j]!;
      const pad = batch.boxPadding ?? 0;
      const origin = labelBoxOrigin(tx, ty, bw, bh, batch.anchor, pad);
      const boxFill = batch.boxFills?.[j] ?? batch.boxFill ?? themePaper;
      const boxStroke = batch.boxStrokes?.[j] ?? batch.boxStroke ?? themeInk;
      const sw = batch.boxStrokeWidth ?? 0.5;
      const rx = batch.boxRadius ?? 0;
      parts.push(
        `<rect x="${px(origin.x)}" y="${px(origin.y)}" width="${px(bw)}" height="${px(bh)}" rx="${px(rx)}" ry="${px(rx)}" fill="${boxFill}" stroke="${boxStroke}" stroke-width="${px(sw)}"${alpha === undefined ? "" : alphaAttr(alpha)}/>`,
      );
    }
    parts.push(
      `<text x="${px(tx)}" y="${px(ty)}" dy="0.32em" fill="${mark.fill}"${size === undefined ? "" : ` font-size="${px(size)}"`}${alpha === undefined ? "" : alphaAttr(alpha)}>${escapeXML(batch.texts[j]!)}</text>`,
    );
  }
  parts.push("</g>");
  return parts.join("");
}

/** Dispatch one geometry batch to its emitter (internal to the pure renderer). */
export function renderBatch(
  batch: Scene["batches"][number],
  theme: ThemeTokens,
  mode: PaintRenderMode = "full",
): string {
  switch (batch.kind) {
    case "points":
      return renderPoints(batch, theme);
    case "paths":
      return renderPaths(batch, theme, mode);
    case "rects":
      return renderRects(batch, theme);
    case "segments":
      return renderSegments(batch, theme, mode);
    case "glyphs":
      return renderGlyphs(batch, theme);
    default: {
      const exhaustive: never = batch;
      throw new Error(`unknown batch kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}
