/**
 * Default inspection mode for a bound layer mark.
 */
import type { ResolvedCandidateInspectMode } from "../candidate-store.js";

import { interceptList } from "./frame-helpers.js";
import type { LayerBinding } from "./types.js";

const EXACT_GEOMS = new Set([
  "point",
  "count",
  "dotplot",
  "text",
  "label",
  "qq",
  "sf_text",
  "sf_label",
  "col",
  "bar",
  "rect",
  "tile",
  "raster",
  "polygon",
  "hex",
  "density_2d_filled",
  "map",
  "sf",
  "bin_2d",
  "errorbar",
  "linerange",
  "pointrange",
  "crossbar",
  "boxplot",
  "violin",
  "rug",
]);
const X_GEOMS = new Set([
  "line",
  "function",
  "qq_line",
  "path",
  "step",
  "contour",
  "area",
  "density",
  "smooth",
  "quantile",
  "density_2d",
]);

/**
 * Layer-level auto hit mode. Returns `undefined` when the store should use
 * geometry-based {@link defaultAutoMode} (e.g. finite segments: axis from dx/dy).
 */
export function candidateAutoMode(
  binding: LayerBinding,
  primitiveIndex: number,
): ResolvedCandidateInspectMode | undefined {
  const geom = binding.layer.geom;
  if (EXACT_GEOMS.has(geom)) return "exact";
  if (X_GEOMS.has(geom)) return "x";
  switch (geom) {
    // Points/text: exact focus + hover ring only. Axis grouping (`x`/`y`/`xy`)
    // is opt-in — auto→xy drew a full crosshair and multi-member tooltips on
    // dense scatters without adding much (#754).
    case "ribbon":
      return binding.ribbonOrientation === "y" ? "y" : "x";
    case "spoke":
    case "segment":
      // Geometry-based mode in defaultAutoMode (long horizontal → "y", vertical → "x").
      return undefined;
    case "rug":
      // Edge chrome: short ticks stay exact-only (not axis-group hover).
      return "exact";
    case "rule": {
      if (binding.ruleForm === "vertical") return "x";
      if (binding.ruleForm === "horizontal") return "y";
      const params = (binding.layer.params ?? {}) as { xintercept?: unknown };
      return primitiveIndex < interceptList(params.xintercept).length ? "x" : "y";
    }
    case "abline":
    case "curve":
      // Both draw real marks, so "xy" (crosshair + multi-member hover) is
      // probably wrong for them — but it is what the old `default:` gave, and
      // changing it is a product call, not a typing one (#1042).
      return "xy";
    case "blank":
      // geom_blank emits no hit targets, so the mode is never consulted.
      return "xy";
    default: {
      // No silent fall-through: a geom with no arm above is a compile error
      // here, not a mark that quietly gets the wrong inspect mode (#1042).
      throw new Error(`unhandled geom in candidate auto mode: ${geom}`);
    }
  }
}
