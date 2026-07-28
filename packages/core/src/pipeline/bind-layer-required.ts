/**
 * Required-channel checks for bindLayer by geom/stat.
 *
 * Exhaustive over {@link NormalizedGeomName}: a geom with no arm is a compile
 * error, not a silent "require nothing" fall-through (#1042). Geoms that truly
 * need no x/y channels (function, abline, map, sf*, blank, qq*) have explicit
 * empty arms with comments — other channels are enforced elsewhere
 * (sample / map_id / label in bind-layer-extras, geometry in frame-stats-sf).
 */
import type { NormalizedGeomName, StatName } from "@ggsvelte/spec";

import { requireField } from "./bind-layer-check-field.js";
import type { RuleForm } from "./types.js";

export function assertRequiredChannels(input: {
  geom: NormalizedGeomName;
  stat: StatName;
  index: number;
  ruleForm: RuleForm | null;
  xField: string | null;
  yField: string | null;
  yStatColumn: string | null;
  yminField: string | null;
  ymaxField: string | null;
  xminField?: string | null;
  xmaxField?: string | null;
  xendField?: string | null;
  yendField?: string | null;
  angleField?: string | null;
  radiusField?: string | null;
  layerParams?: unknown;
  ribbonOrientation?: "x" | "y";
  /** Effective rug sides string (default bl) when geom is rug. */
  rugSides?: string;
}): void {
  const {
    geom,
    stat,
    index,
    ruleForm,
    xField,
    yField,
    yStatColumn,
    yminField,
    ymaxField,
    xminField = null,
    xmaxField = null,
    xendField = null,
    yendField = null,
    angleField = null,
    radiusField = null,
    layerParams,
    ribbonOrientation,
    rugSides,
  } = input;

  switch (geom) {
    case "point":
    case "count":
    case "line":
    case "path":
    case "step":
    case "col":
    case "area":
    case "polygon":
    case "text":
    case "label":
    case "smooth":
    case "quantile":
    case "boxplot":
    case "violin":
    case "tile":
    case "raster":
    case "hex":
    case "density_2d":
    case "density_2d_filled":
    case "bin_2d": {
      requireField(xField, "x", index, geom);
      // yStatColumn set (e.g. ecdf) means y is computed — skip field requirement.
      if (yStatColumn === null) requireField(yField, "y", index, geom);
      break;
    }
    case "bar":
    case "density":
    case "dotplot": {
      requireField(xField, "x", index, geom);
      break;
    }
    case "contour": {
      requireField(xField, "x", index, geom);
      requireField(yField, "y", index, geom);
      break;
    }
    case "errorbar":
    case "linerange":
    case "pointrange":
    case "crossbar": {
      requireField(xField, "x", index, geom);
      if (stat === "summary" || stat === "summary_bin") {
        requireField(yField, "y", index, geom);
      } else {
        requireField(yminField, "ymin", index, geom);
        requireField(ymaxField, "ymax", index, geom);
        if (geom === "pointrange" || geom === "crossbar") {
          requireField(yField, "y", index, geom);
        }
      }
      break;
    }
    case "rect": {
      requireField(xminField, "xmin", index, geom);
      requireField(xmaxField, "xmax", index, geom);
      requireField(yminField, "ymin", index, geom);
      requireField(ymaxField, "ymax", index, geom);
      break;
    }
    case "ribbon": {
      const orientation = ribbonOrientation ?? "x";
      if (orientation === "x") {
        requireField(xField, "x", index, geom);
        requireField(yminField, "ymin", index, geom);
        requireField(ymaxField, "ymax", index, geom);
      } else {
        requireField(yField, "y", index, geom);
        requireField(xminField, "xmin", index, geom);
        requireField(xmaxField, "xmax", index, geom);
      }
      break;
    }
    case "rule": {
      if (ruleForm === "vertical") requireField(xField, "x", index, geom);
      if (ruleForm === "horizontal") requireField(yField, "y", index, geom);
      // annotation form: intercepts live on params (resolveRuleForm already ran).
      break;
    }
    case "segment":
    case "curve": {
      requireField(xField, "x", index, geom);
      requireField(yField, "y", index, geom);
      requireField(xendField, "xend", index, geom);
      requireField(yendField, "yend", index, geom);
      break;
    }
    case "spoke": {
      requireField(xField, "x", index, geom);
      requireField(yField, "y", index, geom);
      const params =
        typeof layerParams === "object" && layerParams !== null
          ? (layerParams as Record<string, unknown>)
          : {};
      if (angleField === null && params["angle"] === undefined) {
        requireField(angleField, "angle", index, geom);
      }
      if (radiusField === null && params["radius"] === undefined) {
        requireField(radiusField, "radius", index, geom);
      }
      break;
    }
    case "rug": {
      const sides = rugSides !== undefined && rugSides.length > 0 ? rugSides : "bl";
      if (/[bt]/.test(sides)) requireField(xField, "x", index, geom);
      if (/[lr]/.test(sides)) requireField(yField, "y", index, geom);
      break;
    }
    // --- intentional no x/y requirements (channels elsewhere or params) ---
    case "function":
      // Domain from params.xlim / peer layers; y from fun (stat_function).
      break;
    case "abline":
      // Annotation slope/intercept params only.
      break;
    case "map":
      // map_id required in bind-layer-extras; geometry from fortified map.
      break;
    case "sf":
    case "sf_text":
    case "sf_label":
      // Geometry column in frame-stats-sf; label for text/label in extras.
      break;
    case "blank":
      // Scale training only; no marks.
      break;
    case "qq":
    case "qq_line":
      // sample channel required in bind-layer-extras.
      break;
    default: {
      // No silent fall-through: a geom with no arm above is a compile error
      // here, not a layer that quietly requires nothing (#1042).
      const exhaustive: never = geom;
      throw new Error(`unhandled geom in required channels: ${String(exhaustive)}`);
    }
  }
}
