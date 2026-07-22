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
  ribbonOrientation?: "x" | "y";
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
    ribbonOrientation,
  } = input;

  if (
    geom === "point" ||
    geom === "line" ||
    geom === "col" ||
    geom === "area" ||
    geom === "text" ||
    geom === "smooth" ||
    geom === "boxplot"
  ) {
    requireField(xField, "x", index, geom);
    if (yStatColumn === null) requireField(yField, "y", index, geom);
  }
  if (geom === "bar" || geom === "density") requireField(xField, "x", index, geom);
  if (geom === "errorbar") {
    requireField(xField, "x", index, geom);
    if (stat === "summary") {
      requireField(yField, "y", index, geom);
    } else {
      requireField(yminField, "ymin", index, geom);
      requireField(ymaxField, "ymax", index, geom);
    }
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
}
