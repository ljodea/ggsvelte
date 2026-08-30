/**
 * Tooltip field maps per declared layer.
 */
import type { LayerBinding, MappedField } from "./types.js";

export { resolveLayerScaledConstants } from "./layer-scaled-constants.js";

/**
 * One entry per declared layer index. When bindings are shorter (empty data
 * skips bindLayer), missing indices yield empty field maps so layer-indexed
 * consumers stay aligned with `normalized.layers` / `layerBackends`.
 */
export function resolveLayerFields(
  layerCount: number,
  bindings: readonly LayerBinding[],
): MappedField[][] {
  return Array.from({ length: layerCount }, (_, index) => resolveLayerField(bindings[index]));
}

function resolveLayerField(binding: LayerBinding | undefined): MappedField[] {
  if (binding === undefined) return [];
  const fields: MappedField[] = [];
  const push = (channel: string, field: string | null, source?: "stat") => {
    if (field !== null)
      fields.push(source === undefined ? { channel, field } : { channel, field, source });
  };
  const stat = binding.layer.stat ?? "identity";
  const manualFun =
    stat === "manual"
      ? ((binding.layer.params as { fun?: string } | undefined)?.fun ?? null)
      : null;
  resolvePrimaryStatFields(binding, stat, manualFun, push);
  push("ymin", binding.yminField);
  push("ymax", binding.ymaxField);
  push("xmin", binding.xminField);
  push("xmax", binding.xmaxField);
  if (binding.layer.geom === "segment" || binding.layer.geom === "curve") {
    push("xend", binding.xendField);
    push("yend", binding.yendField);
  }
  push("width", binding.widthField);
  push("height", binding.heightField);
  push("color", binding.color.field);
  push("fill", binding.fill.field);
  const fillStat = binding.fill.statColumn ?? null;
  if (fillStat !== null) push("fill", fillStat, "stat");
  const colorStat = binding.color.statColumn ?? null;
  if (colorStat !== null) push("color", colorStat, "stat");
  for (const channel of ["size", "linewidth", "alpha", "shape", "linetype"] as const) {
    const style = binding[channel];
    push(channel, style.field);
    if (style.statColumn !== null) push(channel, style.statColumn, "stat");
  }
  push("label", binding.labelField);
  push("weight", binding.weightField);
  if (stat !== "qq" && stat !== "qq_line") push("sample", binding.sampleField);
  return fields;
}

function resolvePrimaryStatFields(
  binding: LayerBinding,
  stat: string,
  manualFun: string | null,
  push: (channel: string, field: string | null, source?: "stat") => void,
): void {
  const identityLike =
    stat === "identity" ||
    stat === "unique" ||
    stat === "ellipse" ||
    (stat === "manual" && (manualFun === "first" || manualFun === "last"));
  if (identityLike) {
    push("x", binding.xField);
    push("y", binding.yField);
  } else if (stat === "qq" || stat === "qq_line") {
    push("x", "theoretical", "stat");
    push("y", "sample", "stat");
  } else {
    resolveSynthesizedStatFields(binding, stat, push);
  }
}

function resolveSynthesizedStatFields(
  binding: LayerBinding,
  stat: string,
  push: (channel: string, field: string | null, source?: "stat") => void,
): void {
  if (binding.xField !== null) push("x", "x", "stat");
  const countLike = ["count", "bin", "density", "bindot", "ecdf"].includes(stat);
  if (countLike) {
    const field =
      binding.yStatColumn ??
      (stat === "density"
        ? "density"
        : stat === "bindot"
          ? "stackpos"
          : stat === "ecdf"
            ? "ecdf"
            : "count");
    push("y", field, "stat");
  } else if (stat === "bin_2d") push("y", "y", "stat");
  else if (stat === "boxplot") push("y", "middle", "stat");
  else if (
    [
      "smooth",
      "summary",
      "summary_bin",
      "summary_rolling",
      "connect",
      "quantile",
      "manual",
      "contour",
      "density_2d",
      "density_2d_filled",
      "bin_hex",
    ].includes(stat)
  )
    push("y", "y", "stat");
  if (["contour", "density_2d", "density_2d_filled"].includes(stat)) push("level", "level", "stat");
}
