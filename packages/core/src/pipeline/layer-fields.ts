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
  return Array.from({ length: layerCount }, (_, index) => {
    const binding = bindings[index];
    if (binding === undefined) return [];
    const fields: MappedField[] = [];
    const push = (channel: string, field: string | null, source?: "stat") => {
      if (field !== null)
        fields.push(source === undefined ? { channel, field } : { channel, field, source });
    };
    const stat = binding.layer.stat ?? "identity";
    if (stat === "identity") {
      push("x", binding.xField);
      push("y", binding.yField);
    } else {
      // Synthesized stat rows have no source row. Advertise only semantic
      // generated channels that CandidateFacts can resolve truthfully.
      if (binding.xField !== null) push("x", "x", "stat");
      if (stat === "count" || stat === "bin" || stat === "density") {
        push("y", binding.yStatColumn ?? (stat === "density" ? "density" : "count"), "stat");
      } else if (stat === "boxplot") {
        push("y", "middle", "stat");
      } else if (stat === "smooth" || stat === "summary") {
        push("y", "y", "stat");
      }
    }
    push("ymin", binding.yminField);
    push("ymax", binding.ymaxField);
    push("xmin", binding.xminField);
    push("xmax", binding.xmaxField);
    if (binding.layer.geom === "segment") {
      push("xend", binding.xendField);
      push("yend", binding.yendField);
    }
    push("width", binding.widthField);
    push("height", binding.heightField);
    push("color", binding.color.field);
    push("fill", binding.fill.field);
    for (const channel of ["size", "linewidth", "alpha", "shape", "linetype"] as const) {
      const style = binding[channel];
      push(channel, style.field);
      if (style.statColumn !== null) push(channel, style.statColumn, "stat");
    }
    push("label", binding.labelField);
    push("weight", binding.weightField);
    return fields;
  });
}
