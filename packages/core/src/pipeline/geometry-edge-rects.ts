/**
 * Edge-based rectangle geometry for geom rect / tile / raster.
 *
 * Separate from bar/col rectsBatch (geometry-rects.ts): these geoms consume
 * transformed xmin/xmax/ymin/ymax edges (or band-centered tile slots) and
 * support optional per-rect stroke outlines.
 */
import type { RasterParams, TileParams } from "@ggsvelte/spec";

import type { RectsBatch } from "../scene.js";
import { linetypeIndex, type Linetype } from "../scales/style.js";
import { resolution as resolutionOf } from "../stats/numeric.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf, PipelineError } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { DEFAULT_RULE_LINEWIDTH, removedWarning } from "./geometry-shared.js";

function sizeAt(
  frame: LayerFrame,
  field: string | null,
  param: number | undefined,
  defaultSize: number,
  row: number,
): number {
  if (field !== null) {
    const raw = frame.table.column(field)[frame.rowIndex[row]!]!;
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : NaN;
  }
  if (param !== undefined) return param;
  return defaultSize;
}

function defaultResolution(values: Float64Array | null): number {
  if (values === null || values.length === 0) return 1;
  const gap = resolutionOf(values);
  return gap > 0 ? gap : 1;
}

function emitEdges(input: {
  frame: LayerFrame;
  fx: Frame;
  left: Float64Array;
  right: Float64Array;
  bottom: Float64Array;
  top: Float64Array;
}): {
  rects: Float32Array;
  rowIndex: Uint32Array;
  keptRows: Uint32Array;
  kept: number;
  removed: number;
} {
  const { frame, fx, left, right, bottom, top } = input;
  const n = frame.n;
  const rects = new Float32Array(n * 4);
  const rowIndex = new Uint32Array(n);
  const keptRows = new Uint32Array(n);
  let kept = 0;
  let removed = 0;
  for (let row = 0; row < n; row++) {
    const x0t = fx.xScale.type === "band" ? NaN : fx.xScale.normalizeTransformed(left[row]!);
    const x1t = fx.xScale.type === "band" ? NaN : fx.xScale.normalizeTransformed(right[row]!);
    const y0t = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(bottom[row]!);
    const y1t = fx.yScale.type === "band" ? NaN : fx.yScale.normalizeTransformed(top[row]!);
    if (
      !Number.isFinite(x0t) ||
      !Number.isFinite(x1t) ||
      !Number.isFinite(y0t) ||
      !Number.isFinite(y1t)
    ) {
      removed++;
      continue;
    }
    const xPx0 = Math.min(x0t, x1t) * fx.innerWidth;
    const xPx1 = Math.max(x0t, x1t) * fx.innerWidth;
    const y0 = fx.innerHeight - Math.min(y0t, y1t) * fx.innerHeight;
    const y1 = fx.innerHeight - Math.max(y0t, y1t) * fx.innerHeight;
    const o = kept * 4;
    rects[o] = xPx0;
    rects[o + 1] = Math.min(y0, y1);
    rects[o + 2] = Math.abs(xPx1 - xPx0);
    rects[o + 3] = Math.abs(y1 - y0);
    rowIndex[kept] = frame.rowIndex[row]!;
    keptRows[kept] = row;
    kept++;
  }
  if (kept === n) return { rects, rowIndex, keptRows, kept, removed };
  if (kept === 0) {
    return {
      rects: new Float32Array(0),
      rowIndex: new Uint32Array(0),
      keptRows: new Uint32Array(0),
      kept: 0,
      removed,
    };
  }
  return {
    rects: rects.subarray(0, kept * 4).slice(),
    rowIndex: rowIndex.subarray(0, kept).slice(),
    keptRows: keptRows.subarray(0, kept),
    kept,
    removed,
  };
}

function emitBandTiles(input: {
  frame: LayerFrame;
  fx: Frame;
  widthParam: number | undefined;
  heightParam: number | undefined;
}): {
  rects: Float32Array;
  rowIndex: Uint32Array;
  keptRows: Uint32Array;
  kept: number;
  removed: number;
} {
  const { frame, fx, widthParam, heightParam } = input;
  const n = frame.n;
  const rects = new Float32Array(n * 4);
  const rowIndex = new Uint32Array(n);
  const keptRows = new Uint32Array(n);
  let kept = 0;
  let removed = 0;
  for (let row = 0; row < n; row++) {
    let centerX: number | undefined;
    let centerY: number | undefined;
    let wFrac: number;
    let hFrac: number;
    if (fx.xScale.type === "band") {
      const tc = fx.xScale.normalize(frame.xValues?.[row] ?? null);
      if (tc === undefined || Number.isNaN(tc)) {
        removed++;
        continue;
      }
      centerX = tc;
      const w = sizeAt(frame, frame.binding.widthField, widthParam, 1, row);
      wFrac = w * fx.xScale.step;
    } else {
      const cx = frame.xNumeric?.[row];
      if (cx === undefined || !Number.isFinite(cx)) {
        removed++;
        continue;
      }
      const w = sizeAt(
        frame,
        frame.binding.widthField,
        widthParam,
        defaultResolution(frame.xNumeric),
        row,
      );
      if (!(w > 0) || !Number.isFinite(w)) {
        removed++;
        continue;
      }
      const half = w / 2;
      const x0t = fx.xScale.normalizeTransformed(cx - half);
      const x1t = fx.xScale.normalizeTransformed(cx + half);
      if (!Number.isFinite(x0t) || !Number.isFinite(x1t)) {
        removed++;
        continue;
      }
      centerX = (x0t + x1t) / 2;
      wFrac = Math.abs(x1t - x0t);
    }
    if (fx.yScale.type === "band") {
      const tc = fx.yScale.normalize(frame.yValues?.[row] ?? null);
      if (tc === undefined || Number.isNaN(tc)) {
        removed++;
        continue;
      }
      centerY = tc;
      const h = sizeAt(frame, frame.binding.heightField, heightParam, 1, row);
      hFrac = h * fx.yScale.step;
    } else {
      const cy = frame.yNumeric?.[row];
      if (cy === undefined || !Number.isFinite(cy)) {
        removed++;
        continue;
      }
      const h = sizeAt(
        frame,
        frame.binding.heightField,
        heightParam,
        defaultResolution(frame.yNumeric),
        row,
      );
      if (!(h > 0) || !Number.isFinite(h)) {
        removed++;
        continue;
      }
      const half = h / 2;
      const y0t = fx.yScale.normalizeTransformed(cy - half);
      const y1t = fx.yScale.normalizeTransformed(cy + half);
      if (!Number.isFinite(y0t) || !Number.isFinite(y1t)) {
        removed++;
        continue;
      }
      centerY = (y0t + y1t) / 2;
      hFrac = Math.abs(y1t - y0t);
    }
    if (
      centerX === undefined ||
      centerY === undefined ||
      Number.isNaN(centerX) ||
      Number.isNaN(centerY) ||
      !(wFrac > 0) ||
      !(hFrac > 0) ||
      !Number.isFinite(wFrac) ||
      !Number.isFinite(hFrac)
    ) {
      removed++;
      continue;
    }
    const xPx = (centerX - wFrac / 2) * fx.innerWidth;
    const wPx = wFrac * fx.innerWidth;
    const yTop = (1 - (centerY + hFrac / 2)) * fx.innerHeight;
    const hPx = hFrac * fx.innerHeight;
    const o = kept * 4;
    rects[o] = xPx;
    rects[o + 1] = yTop;
    rects[o + 2] = wPx;
    rects[o + 3] = hPx;
    rowIndex[kept] = frame.rowIndex[row]!;
    keptRows[kept] = row;
    kept++;
  }
  if (kept === n) return { rects, rowIndex, keptRows, kept, removed };
  if (kept === 0) {
    return {
      rects: new Float32Array(0),
      rowIndex: new Uint32Array(0),
      keptRows: new Uint32Array(0),
      kept: 0,
      removed,
    };
  }
  return {
    rects: rects.subarray(0, kept * 4).slice(),
    rowIndex: rowIndex.subarray(0, kept).slice(),
    keptRows: keptRows.subarray(0, kept),
    kept,
    removed,
  };
}

function styleEdgeBatch(
  frame: LayerFrame,
  styles: ResolvedStyleScales,
  fill: ResolvedColorScale | null,
  color: ResolvedColorScale | null,
  emitted: {
    rects: Float32Array;
    rowIndex: Uint32Array;
    keptRows: Uint32Array;
    kept: number;
  },
  params: { alpha?: number; linewidth?: number },
  withStroke: boolean,
): RectsBatch {
  const { binding } = frame;
  const batch: RectsBatch = {
    kind: "rects",
    layerIndex: binding.index,
    panelIndex: 0,
    rects: emitted.rects,
    rowIndex: emitted.rowIndex,
    fill: binding.fill.constant,
    alpha:
      typeof binding.alpha.constant === "number" ? binding.alpha.constant : (params.alpha ?? 1),
    anchor: "center",
  };
  const alphas = numericStyleVector(frame, "alpha", emitted.keptRows, styles);
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
  if (fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null)) {
    batch.fills = Array.from({ length: emitted.kept }, (_, j) =>
      colorOf(
        fill,
        frame.fillValues === null
          ? binding.fill.scaledConstant!
          : frame.fillValues[emitted.keptRows[j]!]!,
      ),
    );
  }
  if (withStroke) {
    const wantsStroke =
      color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
    const constantStroke = binding.color.constant;
    if (wantsStroke) {
      batch.strokes = Array.from({ length: emitted.kept }, (_, j) =>
        colorOf(
          color,
          frame.colorValues === null
            ? binding.color.scaledConstant!
            : frame.colorValues[emitted.keptRows[j]!]!,
        ),
      );
      batch.stroke = null;
    } else if (constantStroke !== null) {
      batch.stroke = constantStroke;
    }
    if (batch.stroke !== undefined || batch.strokes !== undefined) {
      batch.strokeWidth =
        typeof binding.linewidth?.constant === "number"
          ? binding.linewidth.constant
          : (params.linewidth ?? DEFAULT_RULE_LINEWIDTH);
      const linewidths = numericStyleVector(frame, "linewidth", emitted.keptRows, styles);
      if (linewidths !== undefined) batch.strokeWidths = linewidths;
      if (typeof binding.linetype?.constant === "string") {
        batch.linetype = binding.linetype.constant as Linetype;
      }
      const linetypeIndexes = indexedStyleVector(
        frame,
        "linetype",
        emitted.keptRows,
        styles,
        (value) => linetypeIndex(value as Linetype),
      );
      if (linetypeIndexes !== undefined) batch.linetypeIndexes = linetypeIndexes;
    }
  }
  return batch;
}

/** geom rect: xmin/xmax/ymin/ymax edges already on the frame. */
export function edgeRectsBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): RectsBatch | null {
  if (frame.xmin === null || frame.xmax === null || frame.ymin === null || frame.ymax === null) {
    return null;
  }
  const params = (frame.binding.layer.params ?? {}) as { alpha?: number; linewidth?: number };
  const emitted = emitEdges({
    frame,
    fx,
    left: frame.xmin,
    right: frame.xmax,
    bottom: frame.ymin,
    top: frame.ymax,
  });
  removedWarning(emitted.removed, frame.binding.index, warnings);
  if (emitted.kept === 0) return null;
  return styleEdgeBatch(frame, styles, fill, color, emitted, params, true);
}

/** geom tile: center + size (band or continuous). */
export function tileRectsBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): RectsBatch | null {
  const params = (frame.binding.layer.params ?? {}) as TileParams;
  // Validate non-positive mapped/constant sizes once with a sample.
  for (let row = 0; row < frame.n; row++) {
    for (const [field, param, axis] of [
      [frame.binding.widthField, params.width, "width"],
      [frame.binding.heightField, params.height, "height"],
    ] as const) {
      if (field === null && param === undefined) continue;
      const v = sizeAt(frame, field, param, 1, row);
      if (!(v > 0) || !Number.isFinite(v)) {
        throw new PipelineError(
          "tile-nonpositive-size",
          `/layers/${frame.binding.index}/aes/${axis}`,
          `The tile geom requires positive finite ${axis}; got ${String(v)}. Map a positive ${axis} or set params.${axis}.`,
        );
      }
    }
  }
  const emitted = emitBandTiles({
    frame,
    fx,
    widthParam: params.width,
    heightParam: params.height,
  });
  removedWarning(emitted.removed, frame.binding.index, warnings);
  if (emitted.kept === 0) return null;
  return styleEdgeBatch(frame, styles, fill, color, emitted, params, true);
}

/** geom raster: equal cells from edges prepared in expandEdgeFrame; no stroke. */
export function rasterRectsBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): RectsBatch | null {
  if (fx.xScale.type === "band" || fx.yScale.type === "band") {
    throw new PipelineError(
      "channel-type-mismatch",
      `/layers/${frame.binding.index}`,
      'The raster geom needs continuous x and y. Use geom "tile" for discrete axes.',
    );
  }
  if (frame.xmin === null || frame.xmax === null || frame.ymin === null || frame.ymax === null) {
    return null;
  }
  const params = (frame.binding.layer.params ?? {}) as RasterParams;
  const emitted = emitEdges({
    frame,
    fx,
    left: frame.xmin,
    right: frame.xmax,
    bottom: frame.ymin,
    top: frame.ymax,
  });
  removedWarning(emitted.removed, frame.binding.index, warnings);
  if (emitted.kept === 0) return null;
  return styleEdgeBatch(frame, styles, fill, null, emitted, params, false);
}
