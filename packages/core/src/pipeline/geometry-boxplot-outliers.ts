/**
 * Boxplot outlier points, placed at the (possibly dodged) box x center.
 */
import type { BoxplotParams } from "@ggsvelte/spec";

import type { GeometryBatch, PointsBatch } from "../scene.js";

import type { LayerFrame } from "./types.js";
import { NO_ROW } from "./types.js";
import type { Frame } from "./geometry-shared.js";

const DEFAULT_OUTLIER_SIZE = 1.5;

export function buildBoxplotOutliers(input: {
  frame: LayerFrame;
  fx: Frame;
  centerPx: readonly number[];
  alpha: number;
  params: BoxplotParams;
}): GeometryBatch | null {
  const { frame, fx, centerPx, alpha, params } = input;
  const box = frame.box;
  if (box === null || box.outlierY.length === 0) return null;
  if (fx.yScale.type === "band") return null;
  const yScale = fx.yScale;

  const positions: number[] = [];
  const rowIndex: number[] = [];
  for (let i = 0; i < box.outlierY.length; i++) {
    const boxRow = box.outlierBox[i]!;
    const cx = centerPx[boxRow];
    const ty = yScale.normalize(box.outlierY[i]!);
    if (cx === undefined || Number.isNaN(cx) || Number.isNaN(ty)) continue;
    positions.push(cx, fx.innerHeight - ty * fx.innerHeight);
    rowIndex.push(NO_ROW);
  }
  if (rowIndex.length === 0) return null;

  const batch: PointsBatch = {
    kind: "points",
    layerIndex: frame.binding.index,
    panelIndex: 0,
    positions: Float32Array.from(positions),
    rowIndex: Uint32Array.from(rowIndex),
    size: params.outlierSize ?? DEFAULT_OUTLIER_SIZE,
    alpha,
    shape: "circle",
    fill: null,
  };
  return batch;
}
