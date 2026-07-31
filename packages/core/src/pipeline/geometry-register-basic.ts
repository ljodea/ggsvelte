/**
 * Identity-chart geom batch registration for `@ggsvelte/core/render`.
 * Covers scatter, line, bar/col, area, rule, text, segment, blank, rect.
 */
import type { GeometryBatch } from "../scene.js";

import { registerGeomBatch, type GeometryBatchBuilder } from "./geometry-registry.js";
import { areaBatch } from "./geometry-paths-area.js";
import { lineBatch } from "./geometry-paths-line.js";
import { pointsBatch } from "./geometry-points.js";
import { rectsBatch } from "./geometry-rects.js";
import { edgeRectsBatch } from "./geometry-edge-rects.js";
import { segmentsBatch } from "./geometry-segments.js";
import { finiteSegmentBatch } from "./geometry-segment-finite.js";
import { glyphsBatch } from "./geometry-glyphs.js";
import { ribbonBatches } from "./geometry-ribbon.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

export function registerBasicGeomBatches(): void {
  if (registered) return;
  registered = true;

  const points: GeometryBatchBuilder = (frame, fx, color, _fill, styles, warnings) =>
    single(pointsBatch(frame, fx, color, styles, warnings));
  registerGeomBatch("point", points);
  registerGeomBatch("count", points);

  const lineLike: GeometryBatchBuilder = (frame, fx, color, _fill, styles, warnings) => {
    const connectNoSort = frame.binding.layer.stat === "connect";
    return single(
      lineBatch(frame, fx, color, styles, warnings, connectNoSort ? { sortByX: false } : {}),
    );
  };
  registerGeomBatch("line", lineLike);
  registerGeomBatch("step", lineLike);
  registerGeomBatch("path", (frame, fx, color, _fill, styles, warnings) =>
    single(lineBatch(frame, fx, color, styles, warnings, { sortByX: false })),
  );

  const rects: GeometryBatchBuilder = (frame, fx, _color, fill, styles, warnings) =>
    single(rectsBatch(frame, fx, fill, styles, warnings));
  registerGeomBatch("col", rects);
  registerGeomBatch("bar", rects);

  const area: GeometryBatchBuilder = (frame, fx, _color, fill, styles, warnings) =>
    single(areaBatch(frame, fx, fill, styles, warnings));
  registerGeomBatch("area", area);
  registerGeomBatch("density", area);

  registerGeomBatch("rule", (frame, fx, color, _fill, styles, warnings) =>
    single(segmentsBatch(frame, fx, color, styles, warnings)),
  );
  registerGeomBatch("segment", (frame, fx, color, _fill, styles, warnings) =>
    single(finiteSegmentBatch(frame, fx, color, styles, warnings)),
  );

  const glyphs: GeometryBatchBuilder = (frame, fx, color, fill, styles, warnings) =>
    single(glyphsBatch(frame, fx, color, fill, styles, warnings));
  registerGeomBatch("text", glyphs);
  registerGeomBatch("label", glyphs);

  registerGeomBatch("rect", (frame, fx, color, fill, styles, warnings) =>
    single(edgeRectsBatch(frame, fx, fill, color, styles, warnings)),
  );
  registerGeomBatch("ribbon", (frame, fx, color, fill, styles, warnings) =>
    ribbonBatches(frame, fx, color, fill, styles, warnings),
  );
  registerGeomBatch("blank", () => []);
}

registerBasicGeomBatches();
