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
    case "label":
    case "qq":
    case "sf_text":
    case "sf_label":
      return "exact";
    case "col":
    case "bar":
    case "rect":
    case "tile":
    case "raster":
    case "polygon":
    case "hex":
    case "density_2d_filled":
    case "map":
    case "sf":
    case "bin_2d":
      return "exact";

    case "line":
    case "qq_line":
    case "path":
    case "step":
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
    case "rug":
      // Edge chrome: short ticks stay exact-only (not axis-group hover).
      return "exact";
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
