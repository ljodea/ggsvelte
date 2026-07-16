/**
 * Pure legend surface event decisions for GGPlot.
 *
 * Hosts own DOM handlers, suppress/touch index lifecycle, focus moves,
 * commitLegend side effects, and announcements. This module owns only
 * key routing and touch/click coordination priority.
 */

// ---- keydown ----

export type LegendKeyInput = {
  readonly key: string;
};

export type LegendKeyAction =
  | { readonly type: "move"; readonly key: string }
  | { readonly type: "commit" }
  | { readonly type: "clear" }
  | { readonly type: "none" };

export type LegendKeyResolution = {
  readonly action: LegendKeyAction;
  readonly preventDefault: boolean;
};

const isRovingKey = (key: string): boolean =>
  key === "ArrowRight" ||
  key === "ArrowDown" ||
  key === "ArrowLeft" ||
  key === "ArrowUp" ||
  key === "Home" ||
  key === "End";

/**
 * Pure decision for a legend target `keydown` handler.
 * Priority: roving arrows/Home/End → Enter/Space commit → Escape clear → none.
 * Callers own preventDefault, focus move, commitLegend, and clearLegendFocus.
 */
export function resolveLegendKeyAction(input: LegendKeyInput): LegendKeyResolution {
  const { key } = input;

  if (isRovingKey(key)) {
    return { preventDefault: true, action: { type: "move", key } };
  }

  if (key === "Enter" || key === " ") {
    return { preventDefault: true, action: { type: "commit" } };
  }

  if (key === "Escape") {
    return { preventDefault: true, action: { type: "clear" } };
  }

  return { preventDefault: false, action: { type: "none" } };
}

// ---- pointer up (touch commit gate) ----

export type LegendPointerUpInput = {
  readonly pointerType: string;
  readonly index: number;
  /** Host `legendTouchIndex` from pointerdown; -1 if none/cancelled. */
  readonly touchIndex: number;
};

export type LegendPointerUpAction = { readonly type: "touch-commit" } | { readonly type: "none" };

/**
 * Pure decision for legend target `pointerup`.
 * Touch-commit only when pointerType is touch and touchIndex matches index.
 * Host on touch-commit: clear touchIndex, set suppressLegendClick, then commit.
 * Host on none: no suppress flag change (mismatched up after cancel stays quiet).
 *
 * `legendTouchIndex` is a single host slot (not pointerId-keyed). Multi-touch
 * is not modeled; cancel resets the slot before this resolver runs.
 */
export function resolveLegendPointerUpAction(input: LegendPointerUpInput): LegendPointerUpAction {
  if (input.pointerType !== "touch") return { type: "none" };
  if (input.touchIndex !== input.index) return { type: "none" };
  return { type: "touch-commit" };
}

// ---- click ----

export type LegendClickInput = {
  /** Host `suppressLegendClick` after a touch commit. */
  readonly suppressClick: boolean;
  /**
   * MouseEvent.detail classification used by the host today.
   * detail === 0 → source "keyboard" (also true for some programmatic clicks —
   * this is current source classification, not an a11y guarantee).
   */
  readonly detail: number;
};

export type LegendClickAction =
  | { readonly type: "suppress" }
  | { readonly type: "commit"; readonly source: "keyboard" | "pointer" };

/**
 * Pure decision for legend target `click`.
 * Priority: suppressClick → suppress; else commit with detail-classified source.
 * Host on suppress: clear suppressLegendClick and return (exact-once touch).
 * Host on commit: legendAction(index, source) + commitLegend when non-null.
 */
export function resolveLegendClickAction(input: LegendClickInput): LegendClickAction {
  if (input.suppressClick) return { type: "suppress" };
  return {
    type: "commit",
    source: input.detail === 0 ? "keyboard" : "pointer",
  };
}
