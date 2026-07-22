/// <reference lib="dom" />
/**
 * Focus-mask types and helpers for canvas mark drawers.
 */
import { renderPrimitiveCount } from "../candidate-geometry.js";
import type { GeometryBatch } from "../scene.js";
import type { BatchInteractionMask } from "../interaction-mask.js";

/**
 * Renderer-neutral focus membership for one geometry batch. Values address
 * point/rect/segment/glyph primitives, or path subpaths (not path vertices).
 * Zero means muted and a non-zero value means focused.
 */
export type PrimitiveFocusMask = ArrayLike<number> | BatchInteractionMask;

/** Optional focus presentation aligned to the `batches` passed to drawStratum. */
export interface CanvasFocusPresentation {
  readonly focusMasks: readonly (PrimitiveFocusMask | null | undefined)[];
  /** Defaults to the scene theme's interactionMuted token. */
  readonly mutedAlpha?: number;
}

export function maskIncludes(mask: PrimitiveFocusMask, index: number): boolean {
  if ("isFocused" in mask) return mask.isFocused(index);
  const value = mask[index];
  return value !== undefined && value !== 0;
}

/** Primitive count for focus-mask address space (paths = subpaths, not vertices). */
export function batchPrimitiveCount(batch: GeometryBatch): number {
  return renderPrimitiveCount(batch);
}

/** True when every addressable primitive is focused (fast path → full drawBatch). */
export function maskIsAllFocused(mask: PrimitiveFocusMask, count: number): boolean {
  if (count === 0) return true;
  if ("isFocused" in mask && mask.primitiveCount === count)
    return mask.focusedCount === mask.primitiveCount;
  for (let index = 0; index < count; index++) {
    if (!maskIncludes(mask, index)) return false;
  }
  return true;
}
