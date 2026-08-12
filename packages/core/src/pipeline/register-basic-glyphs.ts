import type { GeometryBatch } from "../scene.js";

import { registerGeomBatch, type GeometryBatchBuilder } from "./geometry-registry.js";
import { glyphsBatch } from "./geometry-glyphs.js";

function single(batch: GeometryBatch | null): GeometryBatch[] {
  return batch === null ? [] : [batch];
}

let registered = false;

/** Register text and label glyph geometry. Idempotent. */
export function registerBasicGlyphs(): void {
  if (registered) return;
  registered = true;
  const glyphs: GeometryBatchBuilder = (frame, fx, color, fill, styles, warnings) =>
    single(glyphsBatch(frame, fx, color, fill, styles, warnings));
  registerGeomBatch("text", glyphs);
  registerGeomBatch("label", glyphs);
}
