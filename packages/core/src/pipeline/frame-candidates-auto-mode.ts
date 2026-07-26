/**
 * Default inspection mode for a bound layer mark.
 */
import type { ResolvedCandidateInspectMode } from "../candidate-store.js";

import { interceptList } from "./frame-helpers.js";
import type { LayerBinding } from "./types.js";

/**
 * Layer-level auto hit mode. Returns `undefined` when the store should use
 * geometry-based {@link defaultAutoMode} (e.g. finite segments: axis from dx/dy).
 */
export function candidateAutoMode(
  binding: LayerBinding,
  primitiveIndex: number,
): ResolvedCandidateInspectMode | undefined {
  switch (binding.layer.geom) {
    // Points/text: exact focus + hover ring only. Axis grouping (`x`/`y`/`xy`)
    // is opt-in — auto→xy drew a full crosshair and multi-member tooltips on
    // dense scatters without adding much (#754).
    case "point":
    case "dotplot":
    case "text":
      return "exact";
    case "col":
    case "bar":
    case "rect":
    case "tile":
    case "raster":
    case "density_2d_filled":
    case "map":
    case "sf":
      return "exact";
    case "line":
    case "path":
    case "contour":
    case "area":
    case "density":
    case "smooth":
    case "quantile":
    case "density_2d":
    case "errorbar":
    case "boxplot":
      return "x";
    case "ribbon":
      return binding.ribbonOrientation === "y" ? "y" : "x";
    case "spoke":
    case "segment":
      // Geometry-based mode in defaultAutoMode (long horizontal → "y", vertical → "x").
      return undefined;
    case "rule": {
      if (binding.ruleForm === "vertical") return "x";
      if (binding.ruleForm === "horizontal") return "y";
      const params = (binding.layer.params ?? {}) as { xintercept?: unknown };
      return primitiveIndex < interceptList(params.xintercept).length ? "x" : "y";
    }
    default:
      return "xy";
  }
}
