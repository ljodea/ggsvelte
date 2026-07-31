/**
 * Full geom batch registration for the `@ggsvelte/core` package entry.
 * Includes specialty geoms (smooth, violin, hex, sf, …) on top of basic.
 */
import type { GeometryBatch } from "../scene.js";

import { registerBasicGeomBatches } from "./geometry-register-basic.js";
import { registerGeomBatch, type GeometryBatchBuilder } from "./geometry-registry.js";
import { pointsBatch } from "./geometry-points.js";
import { lineBatch } from "./geometry-paths-line.js";
import { polygonBatch } from "./geometry-paths-polygon.js";
import { smoothBatches } from "./geometry-smooth.js";
import { boxplotBatches } from "./geometry-boxplot.js";
import { errorbarBatch } from "./geometry-errorbar.js";
import { edgeRectsBatch, rasterRectsBatch, tileRectsBatch } from "./geometry-edge-rects.js";
import { finiteSegmentBatch } from "./geometry-segment-finite.js";
import { violinBatch } from "./geometry-violin.js";
import { ablineBatch } from "./geometry-abline.js";
import { curveBatch } from "./geometry-curve.js";
import { hexBatch } from "./geometry-hex.js";
import { rugBatch } from "./geometry-rug.js";
import { crossbarBatches, linerangeBatch, pointrangeBatches } from "./geometry-range.js";
import { glyphsBatch } from "./geometry-glyphs.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

export function registerAllGeomBatches(): void {
  if (registered) return;
  registered = true;
  registerBasicGeomBatches();

  registerGeomBatch("qq", (frame, fx, color, _fill, styles, warnings) =>
    single(pointsBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("dotplot", (frame, fx, color, fill, styles, warnings) =>
    single(pointsBatch(frame, fx, color, styles, warnings, fill)),
  );

  const orderedLine: GeometryBatchBuilder = (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings));
  registerGeomBatch("function", orderedLine);
  registerGeomBatch("qq_line", orderedLine);
  registerGeomBatch("quantile", orderedLine);

  const stitchLine: GeometryBatchBuilder = (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false }));
  registerGeomBatch("contour", stitchLine);
  registerGeomBatch("density_2d", stitchLine);

  registerGeomBatch("density_2d_filled", (frame, fx, color, fill, styles, warnings) =>
    single(polygonBatch(frame, fx, color, fill, styles, warnings)),
  );
  registerGeomBatch("bin_2d", (frame, fx, color, fill, styles, warnings) =>
    single(edgeRectsBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerGeomBatch("tile", (frame, fx, color, fill, styles, warnings) =>
    single(tileRectsBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerGeomBatch("raster", (frame, fx, _color, fill, styles, warnings) =>
    single(rasterRectsBatch(frame, fx, fill, styles, warnings)),
  );
  registerGeomBatch("spoke", (frame, fx, color, _fill, styles, warnings) =>
    single(finiteSegmentBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("abline", (frame, fx, color, _fill, styles, warnings) =>
    single(ablineBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("curve", (frame, fx, color, _fill, styles, warnings) =>
    single(curveBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("rug", (frame, fx, color, _fill, styles, warnings) =>
    single(rugBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("polygon", (frame, fx, color, fill, styles, warnings) =>
    single(polygonBatch(frame, fx, color, fill, styles, warnings)),
  );
  registerGeomBatch("map", (frame, fx, color, fill, styles, warnings) =>
    single(polygonBatch(frame, fx, color, fill, styles, warnings)),
  );

  const glyphs: GeometryBatchBuilder = (frame, fx, color, fill, styles, warnings) =>
    single(glyphsBatch(frame, fx, color, fill, styles, warnings));
  registerGeomBatch("sf_text", glyphs);
  registerGeomBatch("sf_label", glyphs);

  registerGeomBatch("smooth", (frame, fx, color, fill, styles, warnings) =>
    smoothBatches(frame, fx, color, fill, styles, warnings),
  );
  registerGeomBatch("boxplot", (frame, fx, _color, fill, styles, warnings) =>
    boxplotBatches(frame, fx, fill, styles, warnings),
  );
  registerGeomBatch("errorbar", (frame, fx, color, _fill, styles, warnings) =>
    single(errorbarBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("violin", (frame, fx, color, fill, styles, warnings) =>
    single(violinBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerGeomBatch("linerange", (frame, fx, color, _fill, styles, warnings) =>
    single(linerangeBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("pointrange", (frame, fx, color, _fill, styles, warnings) =>
    pointrangeBatches(frame, fx, color, styles, warnings),
  );
  registerGeomBatch("crossbar", (frame, fx, color, fill, styles, warnings) =>
    crossbarBatches(frame, fx, color, fill, styles, warnings),
  );
  registerGeomBatch("hex", (frame, fx, color, fill, styles, warnings) =>
    single(hexBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerGeomBatch("sf", (frame, fx, color, fill, styles, warnings) => {
    const kind = frame.sf?.kind ?? "polygon";
    if (kind === "point") return single(pointsBatch(frame, fx, color, styles, warnings));
    if (kind === "line") {
      return single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false }));
    }
    return single(polygonBatch(frame, fx, color, fill, styles, warnings));
  });
}

registerAllGeomBatches();
