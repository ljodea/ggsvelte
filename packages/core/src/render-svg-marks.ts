/**
 * Mark/batch SVG emitters for the pure renderer.
 * Public: countMarks, pathData. Internal: renderBatch.
 */
import { renderPrimitiveCount } from "./candidate-geometry.js";
import {
  linetypeDash,
  markLinetype,
  pointShapeGeometry,
  pointShapePathD,
  resolvePathMark,
  resolvePointMark,
  type ResolvedGlow,
  type ResolvedGradientPaint,
} from "./mark-paint.js";
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

/** Path data for one subpath ('step' bends at the midpoint between x values). */
export function pathData(
  positions: Float32Array,
  start: number,
  end: number,
  curve: PathsBatch["curve"],
  closed = false,
): string {
  if (end <= start) return "";
  const parts: string[] = [`M${px(positions[start * 2]!)} ${px(positions[start * 2 + 1]!)}`];
  for (let j = start + 1; j < end; j++) {
    const x = positions[j * 2]!;
    const y = positions[j * 2 + 1]!;
    if (curve === "step") {
      const prevX = positions[(j - 1) * 2]!;
      const prevY = positions[(j - 1) * 2 + 1]!;
      const mid = (prevX + x) / 2;
      parts.push(`L${px(mid)} ${px(prevY)}`, `L${px(mid)} ${px(y)}`);
    }
    parts.push(`L${px(x)} ${px(y)}`);
  }
  if (closed) parts.push("Z");
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
  for (let s = 0; s < subpaths; s++) {
    const d = pathData(
      batch.positions,
      batch.pathOffsets[s]!,
      batch.pathOffsets[s + 1]!,
      batch.curve,
      batch.closed === true,
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
          `<path d="${d}" fill="${fill}" stroke="none"${alpha === undefined ? "" : alphaAttr(alpha)}/>`,
        );
      } else {
        const stroke = paintStroke(style.stroke, batch.strokePaint, mode);
        parts.push(
          `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${px(style.width)}"${dashAttrFromDash(style.dash)}${alpha === undefined ? "" : alphaAttr(alpha)} stroke-linejoin="${style.linejoin}" stroke-linecap="${style.linecap}"/>`,
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
  const themeFill = themeVar(batch.fillRole ?? "accent", theme);
  for (let j = 0; j < n; j++) {
    const fill = batch.fills?.[j] ?? batch.fill ?? themeFill;
    const strokeColor =
      batch.strokes?.[j] ??
      (batch.stroke === undefined && batch.strokes === undefined
        ? undefined
        : (batch.stroke ?? themeVar("ink", theme)));
    const strokeAttr =
      strokeColor === undefined
        ? ""
        : ` stroke="${strokeColor}" stroke-width="${px(batch.strokeWidths?.[j] ?? batch.strokeWidth ?? 1)}"${dashAttrFromDash(linetypeDash(markLinetype(batch, j)))}`;
    const alpha = batch.alphas?.[j];
    parts.push(
      `<rect x="${px(batch.rects[j * 4]!)}" y="${px(batch.rects[j * 4 + 1]!)}" width="${px(batch.rects[j * 4 + 2]!)}" height="${px(batch.rects[j * 4 + 3]!)}" fill="${fill}"${strokeAttr}${alpha === undefined ? "" : alphaAttr(alpha)}/>`,
    );
  }
  parts.push("</g>");
  return parts.join("");
}

function renderSegments(batch: SegmentsBatch, theme: ThemeTokens): string {
  const parts: string[] = [
    `<g class="gg-batch gg-segments" data-layer="${batch.layerIndex}"${alphaAttr(batch.alpha)}>`,
  ];
  const n = batch.segments.length / 4;
  const themeInk = themeVar("ink", theme);
  for (let j = 0; j < n; j++) {
    const stroke = batch.strokes?.[j] ?? batch.stroke ?? themeInk;
    const linewidth = batch.linewidths?.[j] ?? batch.linewidth;
    const alpha = batch.alphas?.[j];
    const linecap = batch.linecap === undefined ? "" : ` stroke-linecap="${batch.linecap}"`;
    const style = `${dashAttrFromDash(linetypeDash(markLinetype(batch, j)))}${alpha === undefined ? "" : alphaAttr(alpha)}${linecap}`;
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

function renderGlyphs(batch: GlyphsBatch, theme: ThemeTokens): string {
  const parts: string[] = [
    `<g class="gg-batch gg-glyphs" data-layer="${batch.layerIndex}" font-size="${px(batch.size)}" text-anchor="${batch.anchor}"${alphaAttr(batch.alpha)}>`,
  ];
  const n = batch.texts.length;
  const themeInk = themeVar("ink", theme);
  for (let j = 0; j < n; j++) {
    const fill = batch.colors?.[j] ?? batch.color ?? themeInk;
    const size = batch.sizes?.[j];
    const alpha = batch.alphas?.[j];
    parts.push(
      `<text x="${px(batch.positions[j * 2]!)}" y="${px(batch.positions[j * 2 + 1]!)}" dy="0.32em" fill="${fill}"${size === undefined ? "" : ` font-size="${px(size)}"`}${alpha === undefined ? "" : alphaAttr(alpha)}>${escapeXML(batch.texts[j]!)}</text>`,
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
      return renderSegments(batch, theme);
    case "glyphs":
      return renderGlyphs(batch, theme);
    default: {
      const exhaustive: never = batch;
      throw new Error(`unknown batch kind: ${String((exhaustive as { kind: string }).kind)}`);
    }
  }
}
