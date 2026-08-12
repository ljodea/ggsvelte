import { registerBasicAreas } from "./register-basic-areas.js";
import { registerBasicBars } from "./register-basic-bars.js";
import { registerBasicGlyphs } from "./register-basic-glyphs.js";
import { registerBasicLines } from "./register-basic-lines.js";
import { registerBasicPoints } from "./register-basic-points.js";
import { registerBasicRects } from "./register-basic-rects.js";
import { registerBasicSegments } from "./register-basic-segments.js";

let registered = false;

/** Register every basic identity-chart geom/stat family. Idempotent. */
export function registerBasicGeomBatches(): void {
  if (registered) return;
  registered = true;
  registerBasicPoints();
  registerBasicLines();
  registerBasicBars();
  registerBasicAreas();
  registerBasicSegments();
  registerBasicGlyphs();
  registerBasicRects();
}
