/**
 * Point mark geometry batch builder.
 */
import type { PointsBatch } from "../scene.js";
import { pointShapeIndex, type PointShape } from "../scales/style.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import { colorOf } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import {
  indexedStyleVector,
  numericStyleVector,
  type ResolvedStyleScales,
} from "./geometry-style.js";
import { DEFAULT_POINT_SIZE, removedWarning } from "./geometry-shared.js";
import { collectPointPositions, packPointPixels } from "./geometry-points-collect.js";

export function pointsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): PointsBatch | null {
  const { binding, n } = frame;
  const collected = collectPointPositions(frame, fx);
  removedWarning(n - collected.kept, binding.index, warnings);
  if (collected.kept === 0) return null;

  const { positions, rowIndex } = packPointPixels(collected, frame, fx);
  const params = binding.layer.geom === "point" ? (binding.layer.params ?? {}) : {};
  const literalSize = binding.size.constant;
  const literalAlpha = binding.alpha.constant;
  const literalShape = binding.shape.constant;
  const batch: PointsBatch = {
    kind: "points",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    size: typeof literalSize === "number" ? literalSize : (params.size ?? DEFAULT_POINT_SIZE),
    alpha: typeof literalAlpha === "number" ? literalAlpha : (params.alpha ?? 1),
    shape:
      typeof literalShape === "string" ? (literalShape as PointShape) : (params.shape ?? "circle"),
    fill: binding.color.constant,
  };
  const sizes = numericStyleVector(frame, "size", collected.keptRows, styles);
  const alphas = numericStyleVector(frame, "alpha", collected.keptRows, styles);
  const shapeIndexes = indexedStyleVector(frame, "shape", collected.keptRows, styles, (value) =>
    pointShapeIndex(value as PointShape),
  );
  if (sizes !== undefined) batch.sizes = sizes;
  if (alphas !== undefined) {
    batch.alpha = 1;
    batch.alphas = alphas;
  }
  if (shapeIndexes !== undefined) batch.shapeIndexes = shapeIndexes;
  if (color !== null && (frame.colorValues !== null || binding.color.scaledConstant !== null)) {
    const colors = Array.from<string>({ length: collected.kept });
    for (let j = 0; j < collected.kept; j++) {
      const row = collected.keptRows[j]!;
      const value =
        frame.colorValues === null ? binding.color.scaledConstant! : frame.colorValues[row]!;
      colors[j] = colorOf(color, value);
    }
    batch.colors = colors;
  }
  return batch;
}
