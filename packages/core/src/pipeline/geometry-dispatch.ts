/**
 * Per-geom geometry batch dispatch for a single layer frame.
 */
import type { GeometryBatch } from "../scene.js";

import type { LayerFrame, PipelineWarning, ResolvedColorScale } from "./types.js";
import type { Frame } from "./geometry-shared.js";
import type { ResolvedStyleScales } from "./geometry-style.js";
import {
  areaBatch,
  glyphsBatch,
  lineBatch,
  pointsBatch,
  rectsBatch,
  segmentsBatch,
} from "./geometry-marks.js";
import { polygonBatch } from "./geometry-paths-polygon.js";
import { boxplotBatches, errorbarBatch, smoothBatches } from "./geometry-composites.js";
import { edgeRectsBatch, rasterRectsBatch, tileRectsBatch } from "./geometry-edge-rects.js";
import { ribbonBatches } from "./geometry-ribbon.js";
import { finiteSegmentBatch } from "./geometry-segment-finite.js";
import { violinBatch } from "./geometry-violin.js";
import { ablineBatch } from "./geometry-abline.js";
import { curveBatch } from "./geometry-curve.js";
import { hexBatch } from "./geometry-hex.js";
import { rugBatch } from "./geometry-rug.js";
import { crossbarBatches, linerangeBatch, pointrangeBatches } from "./geometry-range.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

export function dispatchGeometryBatch(
  frame: LayerFrame,
  fx: Frame,
  color: ResolvedColorScale | null,
  fill: ResolvedColorScale | null,
  styles: ResolvedStyleScales,
  warnings: PipelineWarning[],
): GeometryBatch[] {
  switch (frame.binding.layer.geom) {
    case "point":
    case "count":
    case "qq":
      return single(pointsBatch(frame, fx, color, styles, warnings));
    case "dotplot":
      // Pass fill so histodot dots honor aes.fill (ggplot2 fill grouping; #900).
      return single(pointsBatch(frame, fx, color, styles, warnings, fill));
    case "step":
    case "line": {
      // stat_connect emits tied-x step corners; a post-stat x-sort would
      // scramble elbows (#816). Identity line still sorts by x.
      const connectNoSort = frame.binding.layer.stat === "connect";
      return single(
        lineBatch(frame, fx, color, styles, warnings, connectNoSort ? { sortByX: false } : {}),
      );
    }
    case "function":
    case "qq_line":
    case "quantile":
      // Fitted QR grids / QQ line endpoints are already ordered; treat like line.
      return single(lineBatch(frame, fx, color, styles, warnings));
    case "path":
      // Data-order polylines (ggplot2 geom_path); no x-sort (#788).
      return single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false }));
    case "contour":
      // Isolines are authored in stitch order; never x-sort.
      return single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false }));
    case "density_2d":
      // KDE isolines are authored in stitch order; never x-sort.
      return single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false }));
    case "density_2d_filled":
      // Closed isoline rings as filled paths (#802 phase 2).
      return single(polygonBatch(frame, fx, color, fill, styles, warnings));
    case "col":
    case "bar":
      return single(rectsBatch(frame, fx, fill, styles, warnings));
    case "rect":
    case "bin_2d":
      return single(edgeRectsBatch(frame, fx, fill, color, styles, warnings));
    case "tile":
      return single(tileRectsBatch(frame, fx, fill, color, styles, warnings));
    case "raster":
      return single(rasterRectsBatch(frame, fx, fill, styles, warnings));
    case "area":
    case "density":
      return single(areaBatch(frame, fx, fill, styles, warnings));
    case "ribbon":
      return ribbonBatches(frame, fx, color, fill, styles, warnings);
    case "rule":
      return single(segmentsBatch(frame, fx, color, styles, warnings));
    case "segment":
    case "spoke":
      return single(finiteSegmentBatch(frame, fx, color, styles, warnings));
    case "abline":
      return single(ablineBatch(frame, fx, color, styles, warnings));
    case "curve":
      return single(curveBatch(frame, fx, color, styles, warnings));
    case "rug":
      return single(rugBatch(frame, fx, color, styles, warnings));
    case "polygon":
      return single(polygonBatch(frame, fx, color, fill, styles, warnings));
    case "text":
    case "label":
    case "sf_text":
    case "sf_label":
      return single(glyphsBatch(frame, fx, color, fill, styles, warnings));
    case "smooth":
      return smoothBatches(frame, fx, color, fill, styles, warnings);
    case "boxplot":
      return boxplotBatches(frame, fx, fill, styles, warnings);
    case "errorbar":
      return single(errorbarBatch(frame, fx, color, styles, warnings));
    case "violin":
      return single(violinBatch(frame, fx, fill, color, styles, warnings));
    case "linerange":
      return single(linerangeBatch(frame, fx, color, styles, warnings));
    case "pointrange":
      return pointrangeBatches(frame, fx, color, styles, warnings);
    case "crossbar":
      return crossbarBatches(frame, fx, color, fill, styles, warnings);
    case "hex":
      return single(hexBatch(frame, fx, fill, color, styles, warnings));
    case "map":
      // Fortified regions → closed filled paths (ggplot2 geom_map; #808).
      return single(polygonBatch(frame, fx, color, fill, styles, warnings));
    case "sf": {
      // Portable GeoJSON expand (#809 phase 1): kind selected during frame build.
      const kind = frame.sf?.kind ?? "polygon";
      if (kind === "point") return single(pointsBatch(frame, fx, color, styles, warnings));
      if (kind === "line") {
        return single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false }));
      }
      return single(polygonBatch(frame, fx, color, fill, styles, warnings));
    }
    case "blank":
      // ggplot2 geom_blank: train scales, emit no marks / hit targets.
      return [];
    default:
      return [];
  }
}
