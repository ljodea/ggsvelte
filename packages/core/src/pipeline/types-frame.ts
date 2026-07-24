/**
 * Shared internal binding / LayerFrame types used across pipeline phases.
 */
import type { CellValue } from "../table.js";
import { DEFAULT_MISSING_COLOR } from "../scales/engine.js";

import type { ResolvedColorScale } from "./types-public.js";

export { NO_ROW } from "./types-no-row.js";
export type { ColorBinding, LayerBinding, RuleForm, StyleBinding } from "./types-binding.js";
export type { FinalizedLayerFrame, LayerFrame } from "./types-layer-frame.js";

/** Per-mark color lookup over a resolved scale with distinct NA/unknown fallbacks. */
export function colorOf(resolved: ResolvedColorScale, value: CellValue): string {
  if (value === null) return resolved.scale.naValue ?? DEFAULT_MISSING_COLOR;
  return resolved.scale.colorOf(value) ?? resolved.scale.unknownValue ?? DEFAULT_MISSING_COLOR;
}
