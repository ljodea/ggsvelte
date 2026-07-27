/**
 * Hex polygon geometry: one closed PathsBatch subpath per hex cell.
 */
import type { PathsBatch } from "../scene.js";

import { hexVertices } from "../stats/bin-hex.js";
import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { numericStyleVector, type ResolvedStyleScales } from "./geometry-style.js";

/**
 * Project one data-space hex into panel-local vertices.
 * Uses frame x/y centers and hexWidth/hexHeight (data units) from bin_hex.
 */
export function hexBatch(
  frame: LayerFrame,
  fx: Frame,
  fill: ResolvedColorScale | null,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): PathsBatch | null {
  const { binding, n } = frame;
  if (n === 0) return null;
  if (fx.xScale.type === "band" || fx.yScale.type === "band") {
    warnings.push({
      code: "hex-band-scale",
      message: `Layer ${binding.index} (hex): continuous x and y scales are required; band scales are skipped.`,
    });
    return null;
  }

  const widths = frame.hexWidth;
  const heights = frame.hexHeight;
  if (widths === null || heights === null || frame.xNumeric === null || frame.yNumeric === null) {
    warnings.push({
      code: "hex-missing-size",
      message: `Layer ${binding.index} (hex): missing hex width/height from bin_hex stat.`,
    });
    return null;
  }

  const totalVerts = n * 6;
  const positions = new Float32Array(totalVerts * 2);
  const rowIndex = new Uint32Array(totalVerts);
  const pathOffsets = new Uint32Array(n + 1);
  const keptRows = new Uint32Array(n);
  const fills: (string | null)[] = [];
  const strokes: (string | null)[] = [];

  const wantsFill =
    fill !== null && (frame.fillValues !== null || binding.fill.scaledConstant !== null);
  const wantsStroke =
    color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null);
  const constantStroke = binding.color.constant;

  let cursor = 0;
  let subpaths = 0;
  for (let row = 0; row < n; row++) {
    pathOffsets[subpaths] = cursor;
    const cx = frame.xNumeric[row]!;
    const cy = frame.yNumeric[row]!;
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue;

    const w = widths[row]!;
    const h = heights[row]!;
    // Pointy-top: width = √3 · size, height = 2 · size
    // ⇒ size_x = width/√3, size_y = height/2 as center-to-vertex radii.
    const rx = w / Math.sqrt(3);
    const ry = h / 2;
    const dataVerts = hexVertices(cx, cy, rx, ry);
    let ok = true;
    const start = cursor;
    for (const [dx, dy] of dataVerts) {
      const tx = fx.xScale.normalizeTransformed(dx);
      const ty = fx.yScale.normalizeTransformed(dy);
      if (!Number.isFinite(tx) || !Number.isFinite(ty)) {
        ok = false;
        break;
      }
      positions[cursor * 2] = tx * fx.innerWidth;
      positions[cursor * 2 + 1] = fx.innerHeight - ty * fx.innerHeight;
      rowIndex[cursor] = frame.rowIndex[row]!;
      cursor++;
    }
    if (!ok) {
      cursor = start;
      continue;
    }
    if (wantsFill && fill !== null) {
      const value =
        frame.fillValues === null ? binding.fill.scaledConstant! : frame.fillValues[row]!;
      fills.push(colorOf(fill, value));
    } else {
      fills.push(binding.fill.constant);
    }
    if (wantsStroke && color !== null) {
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      strokes.push(colorOf(color, value));
    } else {
      strokes.push(constantStroke);
    }
    keptRows[subpaths] = row;
    subpaths++;
  }
  pathOffsets[subpaths] = cursor;

  if (cursor === 0 || subpaths === 0) return null;

  const params = (binding.layer.params ?? {}) as { alpha?: number; linewidth?: number };
  // Style vectors must index by kept subpath order (not raw frame rows): dropped
  // centers / non-finite projected vertices leave gaps that would misalign alpha
  // and linewidth with the emitted shapes (same pattern as edge-rects keptRows).
  const styleRows = keptRows.subarray(0, subpaths);
  const alphas = numericStyleVector(frame, "alpha", styleRows, styles);
  const linewidths = numericStyleVector(frame, "linewidth", styleRows, styles);

  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions: positions.subarray(0, cursor * 2).slice(),
    rowIndex: rowIndex.subarray(0, cursor).slice(),
    pathOffsets: pathOffsets.subarray(0, subpaths + 1).slice(),
    strokes,
    fills,
    closed: true,
    linewidth:
      typeof binding.linewidth?.constant === "number"
        ? binding.linewidth.constant
        : (params.linewidth ?? 0),
    ...(linewidths !== undefined && { linewidths }),
    alpha:
      alphas === undefined
        ? typeof binding.alpha?.constant === "number"
          ? binding.alpha.constant
          : (params.alpha ?? 1)
        : 1,
    ...(alphas !== undefined && { alphas }),
    curve: "linear",
  };
}
