/**
 * Per-layer scaled constant aesthetic values for legend-focus indexing.
 */
import type { CellValue } from "../table.js";

import type { LayerBinding } from "./types.js";

const STYLE_SCALED_CHANNELS = ["size", "linewidth", "alpha", "shape", "linetype"] as const;

/**
 * One entry per declared layer index (same empty-data padding as fields).
 * Includes color/fill and mapped style scaled constants so discrete style
 * legends can resolve focus/filter keys for `aes: { shape: { value, scale: true } }`.
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
      for (const channel of STYLE_SCALED_CHANNELS) {
        const scaled = binding[channel].scaledConstant;
        if (scaled !== null) out[channel] = scaled;
      }
      return Object.freeze(out);
    }),
  );
}
