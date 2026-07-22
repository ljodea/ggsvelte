/**
 * Shared builders for pure surface/keyboard decision-table suites.
 */
import type { BrushCorners } from "../../src/lib/surface/area-brush.js";
import type { SurfaceKeyboardInput } from "../../src/lib/surface/keyboard.js";

export const draft: BrushCorners = { x0: 10, y0: 20, x1: 40, y1: 50 };
/** Reversed corners — pure table must normalize before finish routing. */
export const reversedDraft: BrushCorners = { x0: 40, y0: 50, x1: 10, y1: 20 };
/** Zero-size draft — keyboard still commits (no too-small evaluation). */
export const zeroDraft: BrushCorners = { x0: 5, y0: 5, x1: 5, y1: 5 };

export const panel = { x: 0, y: 0, width: 100, height: 80 };
/** Interior free corner so unclamped ±1/±10 steps stay in-bounds. */
export const draftInterior: BrushCorners = { x0: 10, y0: 20, x1: 50, y1: 40 };

export const base = (
  overrides: Partial<SurfaceKeyboardInput> & Pick<SurfaceKeyboardInput, "key" | "activeTool">,
): SurfaceKeyboardInput => ({
  shiftKey: false,
  brushCorners: null,
  hasInspection: false,
  pinEnabled: false,
  // Meaningful only when hasInspection (toggle-point-keys); unused otherwise.
  focusKey: null,
  sourceKeys: [],
  // Meaningful for begin-area / nudge; unused otherwise.
  inspectionAnchor: null,
  inspectionPanel: null,
  firstPanel: undefined,
  ...overrides,
});
