/**
 * Shared fixtures for pre-stat position transform characterization.
 */
import type { runPipeline } from "../../src/pipeline.ts";

export const size = { width: 640, height: 400 };
export const log10Rows = [1, 10, 100, 1000, 10_000].map((x, i) => ({ x, y: i + 1 }));

export function xScale(model: ReturnType<typeof runPipeline>) {
  const scale = model.scales.x;
  if (scale.type === "band") throw new Error("expected a continuous x scale");
  return scale;
}
