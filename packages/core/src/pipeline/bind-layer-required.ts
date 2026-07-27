/**
 * Required-channel checks for bindLayer by geom/stat.
 */
import { requireField } from "./bind-layer-helpers.js";
import type { RuleForm } from "./types.js";

export function assertRequiredChannels(input: {
  geom: string;
  stat: string;
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

  if (
    geom === "point" ||
    geom === "line" ||
    geom === "path" ||
    geom === "step" ||
    geom === "col" ||
    geom === "area" ||
    geom === "polygon" ||
    geom === "text" ||
    geom === "smooth" ||
    geom === "quantile" ||
    geom === "boxplot" ||
    geom === "tile" ||
    geom === "raster" ||
    geom === "density_2d" ||
    geom === "density_2d_filled" ||
    geom === "bin_2d"
  ) {
    requireField(xField, "x", index, geom);
    // yStatColumn set (e.g. ecdf) means y is computed — skip field requirement.
    if (yStatColumn === null) requireField(yField, "y", index, geom);
  }
  if (geom === "bar" || geom === "density" || geom === "contour" || geom === "dotplot")
    requireField(xField, "x", index, geom);
  if (geom === "contour") {
    requireField(yField, "y", index, geom);
  }
  if (geom === "errorbar") {
    requireField(xField, "x", index, geom);
    if (stat === "summary" || stat === "summary_bin") {
      requireField(yField, "y", index, geom);
    } else {
      requireField(yminField, "ymin", index, geom);
      requireField(ymaxField, "ymax", index, geom);
    }
  }
  if (geom === "rect") {
    requireField(xminField, "xmin", index, geom);
    requireField(xmaxField, "xmax", index, geom);
    requireField(yminField, "ymin", index, geom);
    requireField(ymaxField, "ymax", index, geom);
  }
  if (geom === "ribbon") {
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
  }
  if (geom === "rule" && ruleForm === "vertical") requireField(xField, "x", index, geom);
  if (geom === "rule" && ruleForm === "horizontal") requireField(yField, "y", index, geom);
  if (geom === "segment" || geom === "curve") {
    requireField(xField, "x", index, geom);
    requireField(yField, "y", index, geom);
    requireField(xendField, "xend", index, geom);
    requireField(yendField, "yend", index, geom);
  }
  if (geom === "spoke") {
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
  }
  if (geom === "rug") {
    const sides = rugSides !== undefined && rugSides.length > 0 ? rugSides : "bl";
    if (/[bt]/.test(sides)) requireField(xField, "x", index, geom);
    if (/[lr]/.test(sides)) requireField(yField, "y", index, geom);
  }
}
