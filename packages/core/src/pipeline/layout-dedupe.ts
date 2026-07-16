/**
 * Warning/advisory dedupe, margin max, and scale domain snapshots.
 */
import type { Margins } from "../layout/layout.js";
import type { PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";

import type { Advisory, PipelineWarning } from "./types.js";

export function dedupeWarnings(list: PipelineWarning[]): PipelineWarning[] {
  const seen = new Set<string>();
  return list.filter((w) => {
    const key = `${w.code} ${w.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupeAdvisories(list: Advisory[]): Advisory[] {
  const seen = new Set<string>();
  return list.filter((a) => {
    const key = `${a.code} ${a.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const elementwiseMaxMargins = (a: Margins, b: Margins): Margins => ({
  top: Math.max(a.top, b.top),
  right: Math.max(a.right, b.right),
  bottom: Math.max(a.bottom, b.bottom),
  left: Math.max(a.left, b.left),
});

export function scaleDomainSnapshot(scale: PositionScale): readonly CellValue[] {
  return Object.freeze([...scale.domain]);
}
