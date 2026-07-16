/**
 * Per-layer scaled constant color/fill values for legend-focus indexing.
 */
import type { CellValue } from "../table.js";

import type { LayerBinding } from "./types.js";

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
