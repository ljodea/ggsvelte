/**
 * Smooth confidence ribbon (closed path under the fitted line).
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import { numericStyleVector, type ResolvedStyleScales } from "./geometry-style.js";
import { writeClosedPathGroups } from "./geometry-paths-closed-batch.js";
import { groupColor, SMOOTH_RIBBON_ALPHA } from "./geometry-smooth-shared.js";

export function buildSmoothRibbonBatch(input: {
  frame: LayerFrame;
  fx: Frame;
  color: ResolvedColorScale | null;
  fill: ResolvedColorScale | null;
  groupRows: readonly (readonly number[])[];
  styles: ResolvedStyleScales;
}): GeometryBatch | null {
  const { frame, fx, color, fill, groupRows, styles } = input;
  const { binding } = frame;
  if (frame.smooth === null || !frame.smooth.band || frame.ymin === null || frame.ymax === null) {
    return null;
  }

  const bandRows = groupRows
    .map((rows) =>
      rows.filter(
        (row) => Number.isFinite(frame.ymin![row]!) && Number.isFinite(frame.ymax![row]!),
      ),
    )
    .filter((rows) => rows.length > 1);
  if (bandRows.length === 0) return null;

  const { positions, rowIndex, closedFrameRows, pathOffsets, fills, strokes } =
    writeClosedPathGroups({
      frame,
      fx,
      groupRows: bandRows,
      yTop: frame.ymax,
      yBottom: frame.ymin,
      fillOf: (rows) => {
        const first = rows[0]!;
        // Ribbon tint: fill channel, else the line's color (band matches
        // its line in multi-series smooths), else theme accent.
        return (
          groupColor(fill, frame.fillValues, binding.fill.scaledConstant, first) ??
          binding.fill.constant ??
          groupColor(color, frame.colorValues, binding.color.scaledConstant, first) ??
          binding.color.constant
        );
      },
    });

  const alphas = numericStyleVector(
    frame,
    "alpha",
    bandRows.map((rows) => rows[0]!),
    styles,
  );
  return {
    kind: "paths",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    closedFrameRows,
    pathOffsets,
    strokes,
    fills,
    closed: true,
    linewidth: 0,
    alpha:
      typeof binding.alpha.constant === "number"
        ? binding.alpha.constant
        : alphas === undefined
          ? SMOOTH_RIBBON_ALPHA
          : 1,
    ...(alphas !== undefined && { alphas }),
    curve: "linear",
  };
}
