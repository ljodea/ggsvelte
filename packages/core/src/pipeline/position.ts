/**
 * Data-space position adjustments (stack/fill/dodge/jitter/nudge) applied
 * to LayerFrames after stats and before scale training — panel-local, like
 * ggplot2.
 */
import type { PositionParams } from "@ggsvelte/spec";

import { DEFAULT_JITTER_SEED, jitterOffsets, nudgeOffsets } from "../positions/jitter.js";
import { positionDodge, positionStack } from "../positions/positions.js";
import { bandKey } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import { isBarLike } from "./scale-training.js";
import type { Advisory, LayerFrame } from "./types.js";

/** Per-row slot keys: band categories, or bin centers for binned bars. */
function slotKeys(frame: LayerFrame): (number | string)[] | null {
  if (frame.xValues !== null) return frame.xValues.map((v) => bandKey(v));
  if (frame.xNumeric !== null) return Array.from(frame.xNumeric);
  return null;
}

export function applyPosition(frame: LayerFrame, advisories: Advisory[], table: ColumnTable): void {
  const { binding } = frame;
  const layer = binding.layer;
  const geom = layer.geom;

  // --- jitter / nudge (point + text layers) -----------------------------------
  if (geom === "point" || geom === "text") {
    const position = layer.position ?? "identity";
    if (position === "identity") return;
    const params: PositionParams = "positionParams" in layer ? (layer.positionParams ?? {}) : {};
    // Offsets are band-step fractions on discrete axes (resolution 1),
    // data units on continuous axes.
    const xDiscrete = binding.xField !== null && table.discreteness(binding.xField) === "discrete";
    const yDiscrete = binding.yField !== null && table.discreteness(binding.yField) === "discrete";
    if (position === "nudge") {
      const { dx, dy } = nudgeOffsets(frame.n, params.x ?? 0, params.y ?? 0);
      frame.offsetX = dx;
      frame.offsetY = dy;
      return;
    }
    // jitter (point only, schema-enforced): seeded — deliberate divergence
    // from ggplot2's random jitter (decision 0010), always surfaced.
    const { dx, dy } = jitterOffsets({
      n: frame.n,
      width: params.width,
      height: params.height,
      seed: params.seed,
      xNumeric: xDiscrete ? null : frame.xNumeric,
      yNumeric: yDiscrete ? null : frame.yNumeric,
    });
    frame.offsetX = dx;
    frame.offsetY = dy;
    advisories.push({
      code: "jitter-seeded",
      path: `layers.${binding.index}`,
      chosen: `deterministic seeded jitter (seed ${params.seed ?? DEFAULT_JITTER_SEED}) — ggplot2 draws new random offsets every render; ggsvelte seeds for reproducibility`,
      howToOverride: `Set positionParams.seed (and width/height) on layer ${binding.index}.`,
    });
    return;
  }

  // --- boxplot dodge -----------------------------------------------------------
  if (geom === "boxplot") {
    if ((layer.position ?? "dodge") !== "dodge" || frame.xValues === null) return;
    const dodge = positionDodge({
      slots: frame.xValues.map((v) => bandKey(v)),
      groups: frame.groups,
    });
    frame.dodgeSlot = dodge.slot;
    frame.dodgeSlotCounts = dodge.slotCount;
    return;
  }

  // --- bar-like stack/fill/dodge ------------------------------------------------
  if (!isBarLike(geom) || frame.yNumeric === null) return;
  const slots = slotKeys(frame);
  if (slots === null) return;
  const position = layer.position ?? "identity";
  const y = frame.yNumeric;

  if (position === "stack" || position === "fill") {
    const { ymin, ymax } = positionStack({ slots, groups: frame.groups, y, mode: position });
    frame.ymin = ymin;
    frame.ymax = ymax;
    return;
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
}
