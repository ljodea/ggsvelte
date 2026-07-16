/**
 * Per-layer pipeline contracts: render backends, tooltip field maps, and
 * scaled-constant values used by legend-focus indexing.
 */
import type { LayerSpec } from "@ggsvelte/spec";

import type { GeometryBatch } from "../scene.js";
import type { CellValue } from "../table.js";

import { batchMarkCount } from "./geometry.js";
import type { Advisory, LayerBackend, LayerBinding, MappedField } from "./types.js";
import { CANVAS_AUTO_THRESHOLD } from "./types.js";

export function resolveLayerBackends(
  layers: readonly LayerSpec[],
  batches: readonly GeometryBatch[],
  a11y: "auto" | "force-svg" | undefined,
  canvasThreshold: number | undefined,
  advisories: Advisory[],
): LayerBackend[] {
  const threshold = canvasThreshold ?? CANVAS_AUTO_THRESHOLD;
  const marksPerLayer: number[] = layers.map(() => 0);
  for (const batch of batches) {
    marksPerLayer[batch.layerIndex] =
      (marksPerLayer[batch.layerIndex] ?? 0) + batchMarkCount(batch);
  }
  return layers.map((layer, index) => {
    if (a11y === "force-svg") return "svg";
    const hint = ("render" in layer ? layer.render : undefined) ?? "auto";
    if (hint === "svg" || hint === "canvas") return hint;
    if ((marksPerLayer[index] ?? 0) > threshold) {
      advisories.push({
        code: "canvas-auto",
        path: `layers.${index}`,
        chosen: `canvas backend (${marksPerLayer[index]} marks > threshold ${threshold}; canvas marks do not expose per-mark accessibility or "copy SVG")`,
        howToOverride: `Set layers[${index}].render to "svg" (or "canvas" to silence this), or set a11y: "force-svg" on the plot.`,
      });
      return "canvas";
    }
    return "svg";
  });
}

export function resolveLayerFields(bindings: readonly LayerBinding[]): MappedField[][] {
  return bindings.map((binding) => {
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

export function resolveLayerScaledConstants(
  bindings: readonly LayerBinding[],
): ReadonlyArray<Readonly<Partial<Record<string, CellValue>>>> {
  return Object.freeze(
    bindings.map((binding) => {
      const out: Partial<Record<string, CellValue>> = {};
      if (binding.color.scaledConstant !== null) out["color"] = binding.color.scaledConstant;
      if (binding.fill.scaledConstant !== null) out["fill"] = binding.fill.scaledConstant;
      return Object.freeze(out);
    }),
  );
}
