/**
 * Tooltip field maps and scaled-constant values per declared layer.
 */
import type { CellValue } from "../table.js";

import type { LayerBinding, MappedField } from "./types.js";

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
    push("color", binding.color.field);
    push("fill", binding.fill.field);
    push("label", binding.labelField);
    push("weight", binding.weightField);
    return fields;
  });
}

/**
 * One entry per declared layer index (same empty-data padding as fields).
 */
export function resolveLayerScaledConstants(
  layerCount: number,
  bindings: readonly LayerBinding[],
): ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>> {
  return Object.freeze(
    Array.from({ length: layerCount }, (_, index) => {
      const binding = bindings[index];
      if (binding === undefined) return Object.freeze({});
      const out: Partial<Record<string, CellValue>> = {};
      if (binding.color.scaledConstant !== null) out["color"] = binding.color.scaledConstant;
      if (binding.fill.scaledConstant !== null) out["fill"] = binding.fill.scaledConstant;
      return Object.freeze(out);
    }),
  );
}
