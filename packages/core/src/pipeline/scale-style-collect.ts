/** Collect mapped style values across panel frames and source catalogs. */
import type { StyleAesthetic } from "@ggsvelte/spec";

import { encodeKey } from "../scales/state.js";
import type { CellValue, ColumnTable } from "../table.js";

import { styleFrameValues } from "./geometry-style.js";
import type { LayerBinding, LayerFrame } from "./types.js";

function bindingOf(binding: LayerBinding, aesthetic: StyleAesthetic) {
  return binding[aesthetic];
}

export function collectStyleValues(input: {
  aesthetic: StyleAesthetic;
  frames: readonly LayerFrame[];
  bindings: readonly LayerBinding[];
  table: ColumnTable;
  sourceTable: ColumnTable;
}): {
  values: CellValue[];
  catalog: CellValue[];
  anyField: boolean;
  anyDiscrete: boolean;
  anyIndexable: boolean;
} {
  const { aesthetic, frames, bindings, table, sourceTable } = input;
  const values: CellValue[] = [];
  let anyField = false;
  let anyDiscrete = false;
  // A legend key can only resolve hover/click emphasis against a real field
  // column or a scaled constant. Stat-only mappings (no field, no constant)
  // leave the key index empty, so their discrete legend must be non-interactive.
  let anyIndexable = false;
  for (const frame of frames) {
    const binding = bindingOf(frame.binding, aesthetic);
    const mapped = styleFrameValues(frame, aesthetic);
    if ((binding.field !== null || binding.statColumn !== null) && mapped !== null) {
      anyField = true;
      if (
        binding.field !== null &&
        table.has(binding.field) &&
        table.discreteness(binding.field) === "discrete"
      ) {
        anyDiscrete = true;
      }
      if (binding.field !== null) anyIndexable = true;
      values.push(...mapped);
    }
    if (binding.scaledConstant !== null) {
      anyField = true;
      anyDiscrete = true;
      anyIndexable = true;
      values.push(binding.scaledConstant);
    }
    if (binding.statColumn !== null) anyField = true;
  }
  const catalog: CellValue[] = [];
  const seen = new Set<string>();
  const add = (value: CellValue) => {
    const key = encodeKey(value);
    if (seen.has(key)) return;
    seen.add(key);
    catalog.push(value);
  };
  for (const binding of bindings) {
    const mapped = bindingOf(binding, aesthetic);
    if (mapped.field !== null && sourceTable.has(mapped.field)) {
      anyField = true;
      anyIndexable = true;
      if (sourceTable.discreteness(mapped.field) === "discrete") anyDiscrete = true;
      for (const value of sourceTable.column(mapped.field)) add(value);
    }
    if (mapped.scaledConstant !== null) {
      anyIndexable = true;
      add(mapped.scaledConstant);
    }
  }
  return { values, catalog, anyField, anyDiscrete, anyIndexable };
}
