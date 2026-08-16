/**
 * Tooltip first-appear / last-leave motion policy.
 *
 * Hover follow and miss-between-marks stay instant. Short opacity is the
 * only allowed chart-chrome motion (DESIGN.md). Scale is not used.
 */

export const TOOLTIP_MOTION_MS = 160;
export const TOOLTIP_EASE = "cubic-bezier(0.23, 1, 0.32, 1)";

export type TooltipMotionReason = "hit" | "miss-on-plot" | "leave-plot" | "close";

export type TooltipMotionPhase = "enter" | "none" | "exit";

export function prefersReducedMotion(
  media: { readonly matches: boolean } | null | undefined,
): boolean {
  return media?.matches === true;
}

export function resolveTooltipDismissReason(input: {
  readonly explicitClose: boolean;
  readonly pointerOnCapture: boolean;
}): "miss-on-plot" | "leave-plot" | "close" {
  if (input.explicitClose) return "close";
  if (input.pointerOnCapture) return "miss-on-plot";
  return "leave-plot";
}

export function resolveTooltipMotion(input: {
  readonly reason: TooltipMotionReason;
  readonly sessionActive: boolean;
  readonly reducedMotion: boolean;
}): {
  readonly phase: TooltipMotionPhase;
  readonly sessionActive: boolean;
} {
  if (input.reason === "hit") {
    if (input.reducedMotion || input.sessionActive) return { phase: "none", sessionActive: true };
    return { phase: "enter", sessionActive: true };
  }
  if (input.reason === "miss-on-plot") {
    return { phase: "none", sessionActive: input.sessionActive };
  }
  // leave-plot | close
  if (input.sessionActive && !input.reducedMotion) return { phase: "exit", sessionActive: false };
  return { phase: "none", sessionActive: false };
}
