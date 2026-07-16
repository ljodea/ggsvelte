/**
 * Shared internal binding / LayerFrame types used across pipeline phases.
 */
import type { CellValue } from "../table.js";

import type { ResolvedColorScale } from "./types-public.js";

export { NO_ROW } from "./types-no-row.js";
export type { ColorBinding, LayerBinding, RuleForm } from "./types-binding.js";
export type { LayerFrame } from "./types-layer-frame.js";

/** Per-mark color lookup over a resolved scale (unknown values render grey). */
export function colorOf(resolved: ResolvedColorScale, value: CellValue): string {
  return resolved.scale.colorOf(value) ?? "#999999";
}
