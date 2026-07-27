/**
 * Migration fixture: deprecated type aliases must keep compiling — and stay
 * assignable to their replacements — until their removal release (ADR 0013).
 */
/* oxlint-disable typescript/no-deprecated -- exercising the deprecated aliases is the point */
import type {
  BrushSelection,
  IntervalSelection,
  PlotInspectionChange,
  ReadonlyZoomDomains,
  TooltipContext,
  ZoomDomains,
} from "../../src/lib/index.js";

type Row = { id: string; value: number };

// Each `before` name must remain assignable to its `after` replacement while
// the alias survives; a failed assignability turns into a compile error here.
// LayerDescriptor was removed in 0.13.0 (#704) — use MarkLayerDescriptor.
export const intervalCompat: BrushSelection extends IntervalSelection ? true : never = true;
export const inspectionCompat: TooltipContext<Row, string> extends PlotInspectionChange<Row, string>
  ? true
  : never = true;
export const zoomCompat: ZoomDomains extends ReadonlyZoomDomains ? true : never = true;
