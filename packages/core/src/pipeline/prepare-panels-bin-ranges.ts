/**
 * Shared bin break grids across facet panels when the x scale is fixed.
 */
import { finiteExtent } from "../scales/train.js";
import type { ColumnTable } from "../table.js";

import type { LayerBinding } from "./types.js";

export function computePanelBinRanges(
  bindings: readonly LayerBinding[],
  table: ColumnTable,
  faceted: boolean,
  freeX: boolean,
): Array<[number, number] | undefined> {
  return bindings.map((binding) => {
    const stat = binding.layer.stat ?? "identity";
    if (stat !== "bin" || !faceted || freeX || binding.xField === null) return void 0;
    return finiteExtent([table.numeric(binding.xField)]) ?? void 0;
  });
}
