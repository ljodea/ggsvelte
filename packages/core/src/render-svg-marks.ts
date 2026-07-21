/**
 * Mark/batch SVG emitters for the pure renderer.
 * Public: countMarks, pathData. Internal: renderBatch.
 */
import type {
  GlyphsBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  Scene,
  SegmentsBatch,
} from "./scene.js";
import type { ThemeTokens } from "./theme.js";
import { themeVar } from "./theme.js";
import { escapeXML, px } from "./render-svg-format.js";

export function countMarks(scene: Scene): number {
  let marks = 0;
  for (const batch of scene.batches) {
    switch (batch.kind) {
      case "points":
      case "glyphs":
        marks += batch.rowIndex.length;
        break;
      case "paths":
        marks += Math.max(0, batch.pathOffsets.length - 1);
        break;
      case "rects":
        marks += batch.rects.length / 4;
        break;
      case "segments":
        marks += batch.segments.length / 4;
        break;
    }
  }
  return marks;
}

function pointShape(
  shape: PointsBatch["shape"],
  x: number,
  y: number,
  size: number,
  fill: string,
): string {
  switch (shape) {
    case "square":
      return `<rect x="${px(x - size)}" y="${px(y - size)}" width="${px(size * 2)}" height="${px(size * 2)}" fill="${fill}"/>`;
    case "triangle":
      return `<path d="M${px(x)} ${px(y - size * 1.2)}L${px(x + size * 1.1)} ${px(y + size * 0.9)}L${px(x - size * 1.1)} ${px(y + size * 0.9)}Z" fill="${fill}"/>`;
    default:
      return `<circle cx="${px(x)}" cy="${px(y)}" r="${px(size)}" fill="${fill}"/>`;
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
    parts.push(
      pointShape(
        batch.shape,
        batch.positions[j * 2]!,
        batch.positions[j * 2 + 1]!,
        batch.size,
        fill,
      ),
    );
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
      parts.push(`<path d="${d}" fill="${fill}" stroke="none"/>`);
    } else {
      const stroke = batch.strokes[s] ?? themeVar("ink", theme);
      parts.push(
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${px(batch.linewidth)}" stroke-linejoin="round" stroke-linecap="round"/>`,
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
  const strokeAttr =
    batch.stroke === undefined
      ? ""
      : ` stroke="${batch.stroke ?? themeVar("ink", theme)}" stroke-width="${px(batch.strokeWidth ?? 1)}"`;
  for (let j = 0; j < n; j++) {
    const fill = batch.fills?.[j] ?? batch.fill ?? themeFill;
    parts.push(
      `<rect x="${px(batch.rects[j * 4]!)}" y="${px(batch.rects[j * 4 + 1]!)}" width="${px(batch.rects[j * 4 + 2]!)}" height="${px(batch.rects[j * 4 + 3]!)}" fill="${fill}"${strokeAttr}/>`,
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
    if (batch.renderPositions !== undefined && batch.renderPathOffsets !== undefined) {
      const d = pathData(
        batch.renderPositions,
        batch.renderPathOffsets[j]!,
        batch.renderPathOffsets[j + 1]!,
        "linear",
      );
      parts.push(
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${px(batch.linewidth)}"/>`,
      );
    } else {
      parts.push(
        `<line x1="${px(batch.segments[j * 4]!)}" y1="${px(batch.segments[j * 4 + 1]!)}" x2="${px(batch.segments[j * 4 + 2]!)}" y2="${px(batch.segments[j * 4 + 3]!)}" stroke="${stroke}" stroke-width="${px(batch.linewidth)}"/>`,
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
    parts.push(
      `<text x="${px(batch.positions[j * 2]!)}" y="${px(batch.positions[j * 2 + 1]!)}" dy="0.32em" fill="${fill}">${escapeXML(batch.texts[j]!)}</text>`,
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
