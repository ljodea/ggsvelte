/**
 * Point/text position adjustments: identity, nudge, and seeded jitter.
 */
import type { PositionParams } from "@ggsvelte/spec";

import { DEFAULT_JITTER_SEED, jitterOffsets, nudgeOffsets } from "../positions/jitter.js";
import type { ColumnTable } from "../table.js";

import { minBinWidth } from "./binned-scale.js";
import { positionDiscreteness } from "./temporal-position.js";
import type { Advisory, LayerFrame } from "./types.js";

/** Apply jitter/nudge for point and text layers. Returns true when handled. */
export function applyPointTextPosition(
  frame: LayerFrame,
  advisories: Advisory[],
  table: ColumnTable,
): boolean {
  const { binding } = frame;
  const layer = binding.layer;
  const geom = layer.geom;
  if (geom !== "point" && geom !== "text") return false;

  const position = layer.position ?? "identity";
  if (position === "identity") return true;
  const params: PositionParams = "positionParams" in layer ? (layer.positionParams ?? {}) : {};
  // Offsets are band-step fractions on discrete axes (resolution 1),
  // data units on continuous axes.
  const xDiscrete =
    binding.xField !== null &&
    positionDiscreteness(table, binding.xField, binding.xConversion) === "discrete";
  const yDiscrete =
    binding.yField !== null &&
    positionDiscreteness(table, binding.yField, binding.yConversion) === "discrete";
  if (position === "nudge") {
    const { dx, dy } = nudgeOffsets(frame.n, params.x ?? 0, params.y ?? 0);
    frame.offsetX = dx;
    frame.offsetY = dy;
    return true;
  }
  // jitter (point only, schema-enforced): seeded — deliberate divergence
  // from ggplot2's random jitter (decision 0010), always surfaced.
  // Binned axes jitter over the transformed BIN WIDTH (never the integer bin
  // id, never the collapsed resolution of single-bin snapped centers).
  const xBinDefault =
    binding.xBinning === undefined ? undefined : 0.4 * minBinWidth(binding.xBinning);
  const yBinDefault =
    binding.yBinning === undefined ? undefined : 0.4 * minBinWidth(binding.yBinning);
  const { dx, dy } = jitterOffsets({
    n: frame.n,
    width: params.width ?? xBinDefault,
    height: params.height ?? yBinDefault,
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
  return true;
}
