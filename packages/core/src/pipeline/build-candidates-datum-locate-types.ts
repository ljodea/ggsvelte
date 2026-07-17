/**
 * Located identity candidate frame/batch context.
 */
import type { CellValue } from "../table.js";

import type { LayerFrame } from "./types.js";

export interface LocatedIdentityCandidate {
  sourceRow: number | null;
  frame: LayerFrame | undefined;
  outlierSourceRow: number | null;
  frameRow: number;
  derivedGroup: number;
  sourceValue: (field: string | undefined) => CellValue;
  xField: string | undefined;
  yField: string | undefined;
  colorField: string | undefined;
  fillField: string | undefined;
  seriesByRow: Map<string, number>;
  sourceRowsByGroup: Map<string, number[]>;
  sourceRowsByGroupX: Map<string, number[]>;
  sourceRowsByGroupBin: Map<string, number[]>;
}
