/**
 * Boxplot dodge position adjustment (panel-local slots).
 */
import { positionDodge } from "../positions/positions.js";
import { bandKey } from "../scales/train.js";

import type { LayerFrame } from "./types.js";

/** Apply boxplot dodge. Returns true when handled (including no-op cases). */
export function applyBoxplotPosition(frame: LayerFrame): boolean {
  if (frame.binding.layer.geom !== "boxplot") return false;
  const layer = frame.binding.layer;
  if ((layer.position ?? "dodge") !== "dodge" || frame.xValues === null) return true;
  const dodge = positionDodge({
    slots: frame.xValues.map((v) => bandKey(v)),
    groups: frame.groups,
  });
  frame.dodgeSlot = dodge.slot;
  frame.dodgeSlotCounts = dodge.slotCount;
  return true;
}
