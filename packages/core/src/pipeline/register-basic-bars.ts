import type { GeometryBatch } from "../scene.js";

import { buildCountFrame } from "./frame-stats-count.js";
import { buildSumFrame } from "./frame-stats-sum.js";
import { registerStatFrame } from "./frame-stats-registry.js";
import { registerGeomBatch, type GeometryBatchBuilder } from "./geometry-registry.js";
import { rectsBatch } from "./geometry-rects.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Register col/bar geometry plus their count/sum stats. Idempotent. */
export function registerBasicBars(): void {
  if (registered) return;
  registered = true;
  const rects: GeometryBatchBuilder = (frame, fx, _color, fill, styles, warnings) =>
    single(rectsBatch(frame, fx, fill, styles, warnings));
  registerGeomBatch("col", rects);
  registerGeomBatch("bar", rects);
  registerStatFrame("count", (binding, table, groups, warnings) =>
    buildCountFrame(binding, table, groups, warnings),
  );
  registerStatFrame("sum", (binding, table, groups, warnings) =>
    buildSumFrame(binding, table, groups, warnings),
  );
}
