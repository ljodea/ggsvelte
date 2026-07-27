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

/** Diameter ≈ binwidth in x data units × dotsize, converted to px radius. */
function dotplotRadiusPx(
  frame: LayerFrame,
  fx: Frame,
  params: { binwidth?: number; dotsize?: number },
): number {
  let binwidth = params.binwidth;
  if (
    (binwidth === undefined || !(binwidth > 0)) &&
    frame.xmin !== null &&
    frame.xmax !== null &&
    frame.n > 0
  ) {
    const w = frame.xmax[0]! - frame.xmin[0]!;
    if (w > 0) binwidth = w;
  }
  if (binwidth === undefined || !(binwidth > 0) || fx.xScale.type === "band") {
    return DEFAULT_POINT_SIZE;
  }
  const domain = fx.xScale.transformedDomain;
  const span = domain[1] - domain[0];
  if (!(span > 0) || !(fx.innerWidth > 0)) return DEFAULT_POINT_SIZE;
  const dotsize = params.dotsize ?? 1;
  const diameterPx = (binwidth / span) * fx.innerWidth * dotsize;
  return Math.max(0.5, diameterPx / 2);
}

export function pointsBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
  /** Fill scale — used as paint for geom_dotplot (ggplot2 fill grouping; #900). */
  fill: ResolvedColorScale | null = null,
): PointsBatch | null {
  const { binding, n } = frame;
  const collected = collectPointPositions(frame, fx);
  removedWarning(n - collected.kept, binding.index, warnings);
  if (collected.kept === 0) return null;

  const { positions, rowIndex } = packPointPixels(collected, frame, fx);
  // point / count / qq / dotplot / geom_sf point family share this builder.
  // SfParams has size/alpha (not shape); DotplotParams adds binwidth/dotsize.
  const geom = binding.layer.geom;
  const params =
    geom === "point" || geom === "count" || geom === "qq" || geom === "dotplot" || geom === "sf"
      ? ((binding.layer.params ?? {}) as {
          size?: number;
          alpha?: number;
          shape?: PointShape;
          binwidth?: number;
          dotsize?: number;
        })
      : {};
  const paramShape =
    geom === "point" || geom === "count" || geom === "qq" || geom === "dotplot"
      ? params.shape
      : undefined;
  const literalSize = binding.size.constant;
  const literalAlpha = binding.alpha.constant;
  const literalShape = binding.shape.constant;
  let markSize = DEFAULT_POINT_SIZE;
  if (typeof literalSize === "number") markSize = literalSize;
  else if (typeof params.size === "number") markSize = params.size;
  else if (geom === "dotplot") markSize = dotplotRadiusPx(frame, fx, params);

  // geom_dotplot paints with fill when present (schema: "Map fill/color for groups").
  // Solid point marks only have one paint channel; fill wins over color when both map.
  const fillMapped =
    frame.fillValues !== null ||
    binding.fill.scaledConstant !== null ||
    binding.fill.constant !== null;
  const paintWithFill = geom === "dotplot" && fillMapped;
  const paintScale = paintWithFill ? fill : color;
  const paintValues = paintWithFill ? frame.fillValues : frame.colorValues;
  const paintChannel = paintWithFill ? binding.fill : binding.color;

  const batch: PointsBatch = {
    kind: "points",
    layerIndex: binding.index,
    panelIndex: 0,
    positions,
    rowIndex,
    size: markSize,
    alpha: typeof literalAlpha === "number" ? literalAlpha : (params.alpha ?? 1),
    shape:
      typeof literalShape === "string" ? (literalShape as PointShape) : (paramShape ?? "circle"),
    fill: paintChannel.constant,
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
  if (paintScale !== null && (paintValues !== null || paintChannel.scaledConstant !== null)) {
    const colors = Array.from<string>({ length: collected.kept });
    for (let j = 0; j < collected.kept; j++) {
      const row = collected.keptRows[j]!;
      const value = paintValues === null ? paintChannel.scaledConstant! : paintValues[row]!;
      colors[j] = colorOf(paintScale, value);
    }
    batch.colors = colors;
  }
  return batch;
}
