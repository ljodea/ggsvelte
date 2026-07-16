/**
 * Geom/stat channel type mismatch and computed-y contracts for bindLayer.
 */
import type { LayerSpec } from "@ggsvelte/spec";

import type { ColumnTable } from "../table.js";

import { validateComputedYAndBinContracts } from "./bind-layer-type-contracts-computed.js";
import { validateGeomChannelTypeContracts } from "./bind-layer-type-contracts-geom.js";

export function validateGeomStatContracts(input: {
  layer: LayerSpec;
  index: number;
  table: ColumnTable;
  xField: string | null;
  yField: string | null;
}): void {
  validateComputedYAndBinContracts(input);
  validateGeomChannelTypeContracts(input);
}
