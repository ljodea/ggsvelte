/**
 * Boxplot dodge position adjustment (panel-local slots).
 */
import { positionDodge } from "../positions/positions.js";
import { encodeKey } from "../scales/state.js";

import type { LayerFrame } from "./types.js";

/** Apply boxplot dodge. Returns true when handled (including no-op cases). */
export function applyBoxplotPosition(frame: LayerFrame): boolean {
  if (frame.binding.layer.geom !== "boxplot") return false;
  const layer = frame.binding.layer;
  if ((layer.position ?? "dodge") !== "dodge" || frame.xValues === null) return true;
  // encodeKey matches the band scale's typed identity (labels can collide).
  const dodge = positionDodge({
    slots: frame.xValues.map((v) => encodeKey(v)),
    groups: frame.groups,
  });
  frame.dodge = { slot: dodge.slot, slotCounts: dodge.slotCount };
  return true;
}
