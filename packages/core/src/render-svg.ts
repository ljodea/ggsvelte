/**
 * renderToSVGString — the synchronous, DOM-free, deterministic renderer
 * (pure entry; safe in Node/edge/workers).
 *
 * - Forces SVG for every layer and takes a `maxMarks` safety limit
 *   (default 100_000) so agent/CLI calls cannot OOM a server.
 * - Deterministic: same spec + same RunOptions (same measurer) => byte-
 *   identical output. No Date.now, no randomness, run ids never serialize.
 * - Theme-ables ride `--gg-*` CSS custom properties with the resolved theme
 *   role as fallback (`var(--gg-ink, currentColor)`) — the default theme's
 *   currentColor behavior is preserved; data-mapped colors are literal
 *   palette values.
 * - Renderer failures are STRUCTURED (PipelineError "renderer-failure"),
 *   never a blank string (failure policy).
 * - A11y basics: role="img", aria-label, <title>.
 *
 * The Svelte adapter mirrors this structure with real markup (same Scene,
 * same class names) — keep the two in sync.
 */
import type { GGBuilder, SpecInput } from "@ggsvelte/spec";

import type { RenderModel, RunOptions } from "./pipeline.js";
import { PipelineError, runPipeline } from "./pipeline.js";
import type {
  GlyphsBatch,
  PathsBatch,
  PointsBatch,
  RectsBatch,
  Scene,
  SceneLegend,
  ScenePanel,
  SegmentsBatch,
} from "./scene.js";
import { STRIP_BAND } from "./scene.js";
import type { ThemeTokens } from "./theme.js";
import { themeVar } from "./theme.js";

export interface RenderSVGOptions extends Omit<RunOptions, "height"> {
  /** Plot height in px (default 400). */
  height?: number;
  /** Refuse to render more marks than this (default 100_000). */
  maxMarks?: number;
}

const DEFAULT_HEIGHT = 400;
const DEFAULT_MAX_MARKS = 100_000;

/** Deterministic pixel formatting: 2 decimals, no trailing zeros, no -0. */
function px(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? "0" : String(r);
}

function escapeXML(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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
    parts.push(
      `<line x1="${px(batch.segments[j * 4]!)}" y1="${px(batch.segments[j * 4 + 1]!)}" x2="${px(batch.segments[j * 4 + 2]!)}" y2="${px(batch.segments[j * 4 + 3]!)}" stroke="${stroke}" stroke-width="${px(batch.linewidth)}"/>`,
    );
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

function renderBatch(batch: Scene["batches"][number], theme: ThemeTokens): string {
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

function renderPanelAxes(panel: ScenePanel, ink: string): string {
  const parts: string[] = [];
  if (panel.axisX !== null) {
    parts.push(
      `<g class="gg-axis gg-axis-x" transform="translate(${px(panel.x)},${px(panel.y + panel.height)})">`,
      `<line class="gg-axis-line" x1="0" y1="0" x2="${px(panel.width)}" y2="0" stroke="${ink}"/>`,
    );
    for (const tick of panel.axisX) {
      parts.push(
        `<g class="gg-tick" transform="translate(${px(tick.pos)},0)">`,
        `<line y2="6" stroke="${ink}"/>`,
      );
      if (tick.label !== "") {
        parts.push(
          `<text y="9" dy="0.71em" text-anchor="middle" fill="${ink}">${escapeXML(tick.label)}</text>`,
        );
      }
      parts.push("</g>");
    }
    parts.push("</g>");
  }
  if (panel.axisY !== null) {
    parts.push(
      `<g class="gg-axis gg-axis-y" transform="translate(${px(panel.x)},${px(panel.y)})">`,
      `<line class="gg-axis-line" x1="0" y1="0" x2="0" y2="${px(panel.height)}" stroke="${ink}"/>`,
    );
    for (const tick of panel.axisY) {
      parts.push(
        `<g class="gg-tick" transform="translate(0,${px(tick.pos)})">`,
        `<line x2="-6" stroke="${ink}"/>`,
      );
      if (tick.label !== "") {
        parts.push(
          `<text x="-9" dy="0.32em" text-anchor="end" fill="${ink}">${escapeXML(tick.label)}</text>`,
        );
      }
      parts.push("</g>");
    }
    parts.push("</g>");
  }
  return parts.join("");
}

/** Facet strip: a subtle band + centered label above the panel. */
function renderStrip(panel: ScenePanel, scene: Scene): string {
  if (panel.strip === "") return "";
  const ink = themeVar("ink", scene.theme);
  const stripFill = themeVar("grid", scene.theme);
  const top = panel.y - STRIP_BAND;
  return (
    `<g class="gg-strip" transform="translate(${px(panel.x)},${px(top)})">` +
    `<rect width="${px(panel.width)}" height="${px(STRIP_BAND - 2)}" fill="${stripFill}"/>` +
    `<text x="${px(panel.width / 2)}" y="${px((STRIP_BAND - 2) / 2)}" dy="0.32em" text-anchor="middle" fill="${ink}">${escapeXML(panel.strip)}</text>` +
    "</g>"
  );
}

/** Plot-level axis titles, positioned against the panel grid's extents. */
function renderAxisTitles(scene: Scene): string {
  const ink = themeVar("ink", scene.theme);
  const panels = scene.panels;
  if (panels.length === 0) return "";
  const gridLeft = Math.min(...panels.map((p) => p.x));
  const gridRight = Math.max(...panels.map((p) => p.x + p.width));
  const gridTop = Math.min(...panels.map((p) => p.y));
  const gridBottom = Math.max(...panels.map((p) => p.y + p.height));
  const parts: string[] = [];
  if (scene.axes.x.title !== "") {
    parts.push(
      `<text class="gg-axis-title" x="${px((gridLeft + gridRight) / 2)}" y="${px(gridBottom + 34)}" text-anchor="middle" fill="${ink}">${escapeXML(scene.axes.x.title)}</text>`,
    );
  }
  if (scene.axes.y.title !== "") {
    parts.push(
      `<text class="gg-axis-title" transform="translate(12,${px((gridTop + gridBottom) / 2)}) rotate(-90)" text-anchor="middle" fill="${ink}">${escapeXML(scene.axes.y.title)}</text>`,
    );
  }
  return parts.join("");
}

function renderGrid(panel: ScenePanel, theme: ThemeTokens): string {
  const parts: string[] = [`<g class="gg-grid" stroke="${themeVar("grid", theme)}">`];
  for (const gx of panel.grid.x) {
    parts.push(`<line x1="${px(gx)}" y1="0" x2="${px(gx)}" y2="${px(panel.height)}"/>`);
  }
  for (const gy of panel.grid.y) {
    parts.push(`<line x1="0" y1="${px(gy)}" x2="${px(panel.width)}" y2="${px(gy)}"/>`);
  }
  parts.push("</g>");
  return parts.join("");
}

function renderLegend(legend: SceneLegend, theme: ThemeTokens, gradientId: string): string {
  const ink = themeVar("ink", theme);
  const parts: string[] = [
    `<g class="gg-legend gg-legend-${legend.scale}" transform="translate(${px(legend.x)},${px(legend.y)})">`,
  ];
  if (legend.type === "discrete") {
    let contentY = 0;
    if (legend.title !== "") {
      parts.push(
        `<text class="gg-legend-title" x="4" y="11" font-weight="bold" fill="${ink}">${escapeXML(legend.title)}</text>`,
      );
      contentY = 0;
    }
    for (const entry of legend.entries) {
      const swatchY = entry.y + contentY + (18 - legend.swatchSize) / 2;
      parts.push(
        `<rect class="gg-legend-swatch" x="4" y="${px(swatchY)}" width="${px(legend.swatchSize)}" height="${px(legend.swatchSize)}" fill="${entry.color}"/>`,
        `<text class="gg-legend-label" x="${px(4 + legend.swatchSize + 6)}" y="${px(entry.y + contentY + 9)}" dy="0.32em" fill="${ink}">${escapeXML(entry.label)}</text>`,
      );
    }
  } else {
    let rampTop = 0;
    if (legend.title !== "") {
      parts.push(
        `<text class="gg-legend-title" x="4" y="11" font-weight="bold" fill="${ink}">${escapeXML(legend.title)}</text>`,
      );
      rampTop = 18;
    }
    const stops = legend.stops
      .map(([offset, color]) => `<stop offset="${px(offset * 100)}%" stop-color="${color}"/>`)
      .join("");
    parts.push(
      `<defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1">${stops}</linearGradient></defs>`,
      `<rect class="gg-legend-ramp" x="4" y="${px(rampTop)}" width="${px(legend.rampWidth)}" height="${px(legend.rampHeight)}" fill="url(#${gradientId})"/>`,
    );
    for (const tick of legend.ticks) {
      parts.push(
        `<text class="gg-legend-label" x="${px(4 + legend.rampWidth + 6)}" y="${px(rampTop + tick.y)}" dy="0.32em" fill="${ink}">${escapeXML(tick.label)}</text>`,
      );
    }
  }
  parts.push("</g>");
  return parts.join("");
}

/** Accessible name for the plot (deterministic, spec-derived). */
export function sceneLabel(scene: Scene): string {
  if (scene.title !== "") return scene.title;
  const x = scene.axes.x.title;
  const y = scene.axes.y.title;
  if (x !== "" && y !== "") return `Plot of ${y} by ${x}`;
  return "ggsvelte plot";
}

/** Serialize a computed Scene to a standalone SVG string. */
export function sceneToSVGString(scene: Scene): string {
  const panel = scene.panels[0]!;
  const theme = scene.theme;
  const ink = themeVar("ink", theme);
  const parts: string[] = [];
  const label = sceneLabel(scene);
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px(scene.width)}" height="${px(scene.height)}" viewBox="0 0 ${px(scene.width)} ${px(scene.height)}" role="img" aria-label="${escapeXML(label)}" class="gg-plot" font-family="Helvetica, Arial, sans-serif" font-size="11">`,
    `<title>${escapeXML(label)}</title>`,
  );
  if (theme.paper !== "none") {
    parts.push(
      `<rect class="gg-paper" width="${px(scene.width)}" height="${px(scene.height)}" fill="${themeVar("paper", theme)}"/>`,
    );
  }
  if (scene.title !== "") {
    parts.push(
      `<text class="gg-title" x="${px(panel.x)}" y="16" font-size="15" font-weight="bold" fill="${ink}">${escapeXML(scene.title)}</text>`,
    );
  }
  if (scene.subtitle !== "") {
    const y = scene.title === "" ? 13 : 34;
    parts.push(
      `<text class="gg-subtitle" x="${px(panel.x)}" y="${px(y)}" font-size="12" fill="${ink}">${escapeXML(scene.subtitle)}</text>`,
    );
  }
  // Panel clip paths (decision 0008/0010 follow-up: marks clip to their
  // panel rect — jitter offsets, se ribbons, and pinned domains stay inside).
  // clipPathUnits is userSpaceOnUse, resolved in the coordinate system of the
  // REFERENCING group, which is panel-translated — so rects sit at 0,0.
  const clips = scene.panels
    .map(
      (p, i) =>
        `<clipPath id="gg-clip-${i}"><rect width="${px(p.width)}" height="${px(p.height)}"/></clipPath>`,
    )
    .join("");
  parts.push(`<defs>${clips}</defs>`);
  for (let i = 0; i < scene.panels.length; i++) {
    const p = scene.panels[i]!;
    parts.push(
      `<g class="gg-panel" data-panel="${i}" transform="translate(${px(p.x)},${px(p.y)})">`,
      renderGrid(p, theme),
      `<g class="gg-marks" clip-path="url(#gg-clip-${i})">`,
    );
    for (const batch of scene.batches) {
      if (batch.panelIndex === i) parts.push(renderBatch(batch, theme));
    }
    parts.push("</g>", "</g>", renderStrip(p, scene), renderPanelAxes(p, ink));
  }
  parts.push(renderAxisTitles(scene));
  for (const legend of scene.legends) {
    // Deterministic gradient ids (byte-determinism wins over cross-plot id
    // uniqueness; documented caveat when inlining several plots in one page —
    // the Svelte adapter generates its own unique ids).
    parts.push(renderLegend(legend, theme, `gg-ramp-${legend.scale}`));
  }
  if (scene.caption !== "") {
    parts.push(
      `<text class="gg-caption" x="${px(scene.width - 4)}" y="${px(scene.height - 4)}" font-size="9" text-anchor="end" fill="${ink}">${escapeXML(scene.caption)}</text>`,
    );
  }
  parts.push("</svg>");
  return parts.join("");
}

function isBuilder(spec: SpecInput | GGBuilder): spec is GGBuilder {
  return typeof (spec as GGBuilder).spec === "function";
}

/**
 * Render a spec (or builder) to a standalone SVG string. Synchronous,
 * DOM-free, deterministic (per measurer). All layers render as SVG.
 */
export function renderToSVGString(spec: SpecInput | GGBuilder, options: RenderSVGOptions): string {
  const resolved: SpecInput = isBuilder(spec) ? spec.spec() : spec;
  const { maxMarks, height, ...run } = options;
  const model: RenderModel = runPipeline(resolved, {
    ...run,
    height: height ?? resolved.height ?? DEFAULT_HEIGHT,
  });
  const limit = maxMarks ?? DEFAULT_MAX_MARKS;
  const marks = countMarks(model.scene);
  if (marks > limit) {
    throw new PipelineError(
      "max-marks-exceeded",
      "/layers",
      `The plot renders ${marks} marks, more than maxMarks (${limit}). ` +
        "Raise maxMarks explicitly or reduce the data.",
    );
  }
  try {
    return sceneToSVGString(model.scene);
  } catch (error) {
    // Failure policy: renderer errors are structured, never blank output.
    throw new PipelineError(
      "renderer-failure",
      "",
      `The SVG renderer failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
