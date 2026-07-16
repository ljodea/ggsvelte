/**
 * Bar-like stack/fill/dodge position adjustments (from zero baseline).
 */
import { positionDodge, positionStack } from "../positions/positions.js";
import { encodeKey } from "../scales/state.js";

import { isBarLike } from "./scale-training.js";
import type { LayerFrame } from "./types.js";

/** Per-row slot keys: band categories, or bin centers for binned bars.
 * `encodeKey` matches the band scale's typed identity, so categories with
 * colliding labels (`1` vs `"1"`) occupy distinct slots. */
export function barSlotKeys(frame: LayerFrame): (number | string)[] | null {
  if (frame.xValues !== null) return frame.xValues.map((v) => encodeKey(v));
  if (frame.xNumeric !== null) return Array.from(frame.xNumeric);
  return null;
}

/** Apply stack/fill/dodge for bar-like geoms. Returns true when handled. */
export function applyBarLikePosition(frame: LayerFrame): boolean {
  const { binding } = frame;
  const geom = binding.layer.geom;
  if (!isBarLike(geom) || frame.yNumeric === null) return false;
  const slots = barSlotKeys(frame);
  if (slots === null) return true;
  const position = binding.layer.position ?? "identity";
  const y = frame.yNumeric;

  if (position === "stack" || position === "fill") {
    const { ymin, ymax } = positionStack({ slots, groups: frame.groups, y, mode: position });
    frame.ymin = ymin;
    frame.ymax = ymax;
    return true;
  }
  // identity / dodge: bars grow from the zero baseline.
  const ymin = new Float64Array(frame.n);
  const ymax = new Float64Array(frame.n);
  for (let i = 0; i < frame.n; i++) {
    const v = Number.isFinite(y[i]!) ? y[i]! : 0;
    ymin[i] = Math.min(0, v);
    ymax[i] = Math.max(0, v);
  }
  frame.ymin = ymin;
  frame.ymax = ymax;
  if (position === "dodge") {
    const dodge = positionDodge({ slots, groups: frame.groups });
    frame.dodgeSlot = dodge.slot;
    frame.dodgeSlotCounts = dodge.slotCount;
  }
  return true;
}
