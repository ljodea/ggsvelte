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
  const geom = binding.layer.geom;
  switch (geom) {
    // Points/text: exact focus + hover ring only. Axis grouping (`x`/`y`/`xy`)
    // is opt-in — auto→xy drew a full crosshair and multi-member tooltips on
    // dense scatters without adding much (#754).
    case "point":
    case "count":
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
    case "function":
    case "qq_line":
    case "path":
    case "step":
    case "contour":
    case "area":
    case "density":
    case "smooth":
    case "quantile":
    case "density_2d":
      return "x";
    // Distribution / interval geoms almost always sit on a discrete band
    // axis. Axis-group hover (x/y/xy) freescrolls a guide through the mark
    // body and leaves blank tooltip rows when the pointer is between band
    // centers — prefer exact focus on the mark (#1528). Authors who want
    // axis grouping can still set mode explicitly (and get an advisory).
    case "errorbar":
    case "linerange":
    case "pointrange":
    case "crossbar":
    case "boxplot":
    case "violin":
      return "exact";
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
      const exhaustive: never = geom;
      throw new Error(`unhandled geom in candidate auto mode: ${String(exhaustive)}`);
    }
  }
}
