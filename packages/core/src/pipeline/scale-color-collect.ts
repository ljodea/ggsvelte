/**
 * Collect color/fill channel values across panel frames for scale training.
 */
import { encodeKey } from "../scales/state.js";
import type { CellValue } from "../table.js";
import type { ColumnTable } from "../table.js";

import type { LayerBinding, LayerFrame } from "./types.js";

export interface CollectedColorChannel {
  values: CellValue[];
  anyDiscreteField: boolean;
  anyField: boolean;
}

export function collectColorChannelValues(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
  table: ColumnTable,
): CollectedColorChannel {
  const values: CellValue[] = [];
  let anyDiscreteField = false;
  let anyField = false;
  for (const frame of frames) {
    const channel = name === "color" ? frame.binding.color : frame.binding.fill;
    const frameValues = name === "color" ? frame.colorValues : frame.fillValues;
    if (channel.field !== null && frameValues !== null) {
      anyField = true;
      if (table.has(channel.field) && table.discreteness(channel.field) === "discrete") {
        anyDiscreteField = true;
      }
      for (const v of frameValues) values.push(v);
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
      values.push(channel.scaledConstant);
    }
  }
  return { values, anyDiscreteField, anyField };
}

export interface CollectedColorCatalog {
  /** Distinct channel values from the unfiltered source table, in first-seen
   * order. Empty when no layer maps the channel. */
  catalogValues: CellValue[];
  anyDiscreteField: boolean;
  anyField: boolean;
}

/**
 * Collect the full source-table value catalog for a color/fill channel so
 * runtime row filters keep categorical assignments stable: the scale trains
 * on every value the source data can produce, not just the filtered rows.
 */
export function collectColorCatalogValues(
  name: "color" | "fill",
  bindings: readonly LayerBinding[],
  catalogTable: ColumnTable,
): CollectedColorCatalog {
  const catalogValues: CellValue[] = [];
  const catalogKeys = new Set<string>();
  const addCatalogValue = (value: CellValue): void => {
    const key = encodeKey(value);
    if (catalogKeys.has(key)) return;
    catalogKeys.add(key);
    catalogValues.push(value);
  };
  let anyDiscreteField = false;
  let anyField = false;
  for (const binding of bindings) {
    const channel = name === "color" ? binding.color : binding.fill;
    if (channel.field !== null && catalogTable.has(channel.field)) {
      anyField = true;
      if (catalogTable.discreteness(channel.field) === "discrete") anyDiscreteField = true;
      for (const value of catalogTable.column(channel.field)) addCatalogValue(value);
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
      addCatalogValue(channel.scaledConstant);
    }
  }
  return { catalogValues, anyDiscreteField, anyField };
}
