/**
 * Ribbon interval validation: inverted bounds after frame construction and
 * before scale training.
 */
import { PipelineError } from "./types.js";
import type { LayerFrame } from "./types.js";

const SAMPLE_LIMIT = 3;

/**
 * Throw when any finite lower bound exceeds its upper bound. Samples use
 * source row indices and transformed measure values (already position-read).
 */
export function assertRibbonBounds(frame: LayerFrame): void {
  if (frame.binding.layer.geom !== "ribbon") return;
  const orientation = frame.binding.ribbonOrientation ?? "x";
  const lo = orientation === "x" ? frame.ymin : frame.xmin;
  const hi = orientation === "x" ? frame.ymax : frame.xmax;
  if (lo === null || hi === null) return;

  const samples: { row: number; lower: number; upper: number }[] = [];
  let count = 0;
  for (let i = 0; i < frame.n; i++) {
    const a = lo[i]!;
    const b = hi[i]!;
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (a > b) {
      count++;
      if (samples.length < SAMPLE_LIMIT) {
        samples.push({ row: frame.rowIndex[i]!, lower: a, upper: b });
      }
    }
  }
  if (count === 0) return;

  const sampleText = samples
    .map((s) => `row ${s.row}: lower=${s.lower}, upper=${s.upper}`)
    .join("; ");
  const more = count > SAMPLE_LIMIT ? ` (+${count - SAMPLE_LIMIT} more)` : "";
  throw new PipelineError(
    "ribbon-inverted-bounds",
    `/layers/${frame.binding.index}`,
    `The ribbon layer has ${count} row(s) where the lower bound exceeds the upper bound (${sampleText}${more}).`,
  );
}
