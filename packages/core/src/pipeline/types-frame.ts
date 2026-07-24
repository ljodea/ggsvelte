/**
 * Shared internal binding / LayerFrame types used across pipeline phases.
 */
import type { CellValue } from "../table.js";

import type { ResolvedColorScale } from "./types-public.js";

export { NO_ROW } from "./types-no-row.js";
export type { ColorBinding, LayerBinding, RuleForm, StyleBinding } from "./types-binding.js";
export type {
  BinPayload,
  BoxFrame,
  BoxPayload,
  DodgePayload,
  FinalizedLayerFrame,
  LayerFrame,
  LayerFrameCore,
  SmoothPayload,
} from "./types-layer-frame.js";

/** Per-mark color lookup over a resolved scale with distinct NA/unknown fallbacks. */
export function colorOf(resolved: ResolvedColorScale, value: CellValue): string {
  if (value === null) return resolved.scale.naValue ?? "#999999";
  return resolved.scale.colorOf(value) ?? resolved.scale.unknownValue ?? "#999999";
}
