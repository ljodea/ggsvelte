/**
 * Mark/batch SVG emitters for the pure renderer.
 * Public: countMarks, pathData. Internal: renderBatch.
 */
import { renderPrimitiveCount } from "./candidate-geometry.js";
import type {
  GlyphsBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  Scene,
  SegmentsBatch,
} from "./scene.js";
import { LINETYPE_DASHES, type Linetype, type PointShape } from "./scales/style.js";
import { LINETYPE_NAMES, POINT_SHAPE_NAMES } from "@ggsvelte/spec";
import type { ThemeTokens } from "./theme.js";
import { themeVar } from "./theme.js";
import { escapeXML, px } from "./render-svg-format.js";

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
  switch (shape) {
    case "square":
      return `<rect class="${className}" x="${px(x - size)}" y="${px(y - size)}" width="${px(size * 2)}" height="${px(size * 2)}" fill="${fill}"/>`;
    case "triangle":
      return `<path class="${className}" d="M${px(x)} ${px(y - size * 1.2)}L${px(x + size * 1.1)} ${px(y + size * 0.9)}L${px(x - size * 1.1)} ${px(y + size * 0.9)}Z" fill="${fill}"/>`;
    case "diamond":
      return `<path class="${className}" d="M${px(x)} ${px(y - size * 1.25)}L${px(x + size)} ${px(y)}L${px(x)} ${px(y + size * 1.25)}L${px(x - size)} ${px(y)}Z" fill="${fill}"/>`;
    case "plus":
      return `<path class="${className}" d="M${px(x - size)} ${px(y)}H${px(x + size)}M${px(x)} ${px(y - size)}V${px(y + size)}" fill="none" stroke="${fill}" stroke-width="${px(Math.max(1, size / 2))}"/>`;
    case "cross":
      return `<path class="${className}" d="M${px(x - size * 0.75)} ${px(y - size * 0.75)}L${px(x + size * 0.75)} ${px(y + size * 0.75)}M${px(x + size * 0.75)} ${px(y - size * 0.75)}L${px(x - size * 0.75)} ${px(y + size * 0.75)}" fill="none" stroke="${fill}" stroke-width="${px(Math.max(1, size / 2))}"/>`;
    default:
      return `<circle class="${className}" cx="${px(x)}" cy="${px(y)}" r="${px(size)}" fill="${fill}"/>`;
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
    const fill = batch.colors?.[j] ?? batch.fill ?? themeInk;
    const shape =
      batch.shapeIndexes === undefined ? batch.shape : POINT_SHAPE_NAMES[batch.shapeIndexes[j]!]!;
    const size = batch.sizes?.[j] ?? batch.size;
    const opacity = batch.alphas === undefined ? "" : alphaAttr(batch.alphas[j]!);
    const mark = pointShape(
      shape,
      batch.positions[j * 2]!,
      batch.positions[j * 2 + 1]!,
      size,
      fill,
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

function dashAttr(linetype: Linetype): string {
  const dash = LINETYPE_DASHES[LINETYPE_NAMES.indexOf(linetype)] ?? [];
  return dash.length === 0 ? "" : ` stroke-dasharray="${dash.join(" ")}"`;
}

function renderPaths(batch: PathsBatch, theme: ThemeTokens): string {
  const isArea = batch.fills !== undefined;
  const parts: string[] = [
    `<g class="gg-batch ${isArea ? "gg-areas" : "gg-paths"}" data-layer="${batch.layerIndex}"${alphaAttr(batch.alpha)}>`,
  ];
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
    if (isArea) {
      const fill = batch.fills![s] ?? themeVar("accent", theme);
      const alpha = batch.alphas?.[s];
      const strokeColor = batch.strokes[s];
      const linewidth = batch.linewidths?.[s] ?? batch.linewidth;
      const strokeActive = strokeColor !== null && strokeColor !== undefined && linewidth > 0;
      if (strokeActive) {
        const linetype =
          batch.linetypeIndexes === undefined
            ? (batch.linetype ?? "solid")
            : LINETYPE_NAMES[batch.linetypeIndexes[s]!]!;
        const linejoin = batch.linejoin ?? "round";
        const linecap = batch.linecap ?? "round";
        parts.push(
          `<path d="${d}" fill="${fill}" stroke="${strokeColor}" stroke-width="${px(linewidth)}"${dashAttr(linetype)}${alpha === undefined ? "" : alphaAttr(alpha)} stroke-linejoin="${linejoin}" stroke-linecap="${linecap}"/>`,
        );
      } else {
        parts.push(
          `<path d="${d}" fill="${fill}" stroke="none"${alpha === undefined ? "" : alphaAttr(alpha)}/>`,
        );
      }
    } else {
      const stroke = batch.strokes[s] ?? themeVar("ink", theme);
      const linewidth = batch.linewidths?.[s] ?? batch.linewidth;
      const alpha = batch.alphas?.[s];
      const linetype =
        batch.linetypeIndexes === undefined
          ? (batch.linetype ?? "solid")
          : LINETYPE_NAMES[batch.linetypeIndexes[s]!]!;
      const linejoin = batch.linejoin ?? "round";
      const linecap = batch.linecap ?? "round";
      parts.push(
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${px(linewidth)}"${dashAttr(linetype)}${alpha === undefined ? "" : alphaAttr(alpha)} stroke-linejoin="${linejoin}" stroke-linecap="${linecap}"/>`,
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
    const linetype =
      batch.linetypeIndexes === undefined
        ? (batch.linetype ?? "solid")
        : LINETYPE_NAMES[batch.linetypeIndexes[j]!]!;
    const strokeColor =
      batch.strokes?.[j] ??
      (batch.stroke === undefined && batch.strokes === undefined
        ? undefined
        : (batch.stroke ?? themeVar("ink", theme)));
    const strokeAttr =
      strokeColor === undefined
        ? ""
        : ` stroke="${strokeColor}" stroke-width="${px(batch.strokeWidths?.[j] ?? batch.strokeWidth ?? 1)}"${dashAttr(linetype)}`;
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
    const linetype =
      batch.linetypeIndexes === undefined
        ? (batch.linetype ?? "solid")
        : LINETYPE_NAMES[batch.linetypeIndexes[j]!]!;
    const linecap = batch.linecap === undefined ? "" : ` stroke-linecap="${batch.linecap}"`;
    const style = `${dashAttr(linetype)}${alpha === undefined ? "" : alphaAttr(alpha)}${linecap}`;
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
export function renderBatch(batch: Scene["batches"][number], theme: ThemeTokens): string {
  switch (batch.kind) {
    case "points":
      return renderPoints(batch, theme);
    case "paths":
      return renderPaths(batch, theme);
    case "rects":
      return renderRects(batch, theme);
    case "segments":
      return renderSegments(batch, theme);
    case "glyphs":
      return renderGlyphs(batch, theme);
    default:
      return "";
  }
}
