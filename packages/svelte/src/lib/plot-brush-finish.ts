import type { InteractionTool } from "./interaction.js";
import type { PlotRect } from "./plot-geometry.js";

/**
 * Matches `PointerBrushEnd` from plot-area-brush without importing that module
 * (local mirror; plot-area-brush does not import this file — no cycle risk,
 * but keep the payload shape self-contained for pure finish routing).
 */
export type FinishBrushEnded =
  | { readonly kind: "too-small"; readonly corners: PlotRect }
  | { readonly kind: "commit"; readonly rect: PlotRect };

export type FinishBrushAction =
  | { readonly type: "keep-second-corner"; readonly corners: PlotRect }
  | { readonly type: "select-end"; readonly rect: PlotRect }
  | { readonly type: "zoom-end"; readonly rect: PlotRect }
  | { readonly type: "end-area" };

/**
 * Pure routing after brush-end evaluation for pointer finish-brush and
 * keyboard complete-area.
 *
 * Takes the full ended discriminant so actions carry rect/corners payloads —
 * host must not re-narrow `ended.kind` for emit/apply.
 *
 * Priority:
 *   1. keep-second-corner — too-small (wins for any tool); carries corners
 *   2. select-end — commit + select-area; carries rect
 *   3. zoom-end — commit + zoom-area; carries rect
 *   4. end-area — commit + any other tool (clear draft + cancel-area, no emit)
 *
 * Host on keep-second-corner: brushRect = action.corners, announce, no cancel-area.
 * Host on select-end/zoom-end/end-area: brushRect=null, cancel-area; emit/apply
 * using action.rect when present.
 *
 * Keyboard complete-area always supplies `kind: "commit"` (no free-corner
 * too-small evaluation); pointer uses `evaluatePointerBrushEnd` first.
 */
export function resolveFinishBrushAction(input: {
  readonly ended: FinishBrushEnded;
  readonly activeTool: InteractionTool;
}): FinishBrushAction {
  if (input.ended.kind === "too-small") {
    return { type: "keep-second-corner", corners: input.ended.corners };
  }
  if (input.activeTool === "select-area") {
    return { type: "select-end", rect: input.ended.rect };
  }
  if (input.activeTool === "zoom-area") {
    return { type: "zoom-end", rect: input.ended.rect };
  }
  return { type: "end-area" };
}
