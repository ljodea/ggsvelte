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
  nonInteractiveValues: CellValue[];
} {
  const { aesthetic, frames, bindings, table, sourceTable } = input;
  const values: CellValue[] = [];
  let anyField = false;
  let anyDiscrete = false;
  // A legend key can only resolve hover/click emphasis against a real field
  // column or a scaled constant. Stat-only mappings (no field, no constant)
  // leave the key index empty, so their discrete legend must be non-interactive.
  let anyIndexable = false;
  // Keys of values that index a rendered mark (field columns, rowful constants),
  // and the rowless annotation constants — used below to keep an annotation-only
  // value out of an interactive legend's entries (it indexes no mark).
  const indexableKeys = new Set<string>();
  const annotationConstants: CellValue[] = [];
  for (const frame of frames) {
    const binding = bindingOf(frame.binding, aesthetic);
    const mapped = styleFrameValues(frame, aesthetic);
    if ((binding.field !== null || binding.statColumn !== null) && mapped !== null) {
      anyField = true;
      const fieldTable = frame.binding.sourceTable ?? table;
      if (
        binding.field !== null &&
        fieldTable.has(binding.field) &&
        fieldTable.discreteness(binding.field) === "discrete"
      ) {
        anyDiscrete = true;
      }
      if (binding.field !== null) anyIndexable = true;
      values.push(...mapped);
    }
    if (binding.scaledConstant !== null) {
      anyField = true;
      anyDiscrete = true;
      // A rowless annotation frame (fixed-intercept rule, n === 0) contributes
      // no source row or lineage, so its legend entry would resolve to an empty
      // key bucket — interactive but emphasizing nothing. Keep it renderable but
      // non-interactive; a real data layer (n > 0) still marks the scale indexable.
      if (frame.n > 0) anyIndexable = true;
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
    // Prefer the layer's own source table so multi-table catalogs union correctly (#589).
    const catalogTable = binding.sourceTable ?? sourceTable;
    if (mapped.field !== null && catalogTable.has(mapped.field)) {
      anyField = true;
      anyIndexable = true;
      if (catalogTable.discreteness(mapped.field) === "discrete") anyDiscrete = true;
      for (const value of catalogTable.column(mapped.field)) {
        indexableKeys.add(encodeKey(value));
        add(value);
      }
    }
    if (mapped.scaledConstant !== null) {
      // Rowless annotation constants index no rendered mark (see the frames loop
      // above), so they render but stay non-interactive.
      if (binding.ruleForm === "annotation") {
        annotationConstants.push(mapped.scaledConstant);
      } else {
        anyIndexable = true;
        indexableKeys.add(encodeKey(mapped.scaledConstant));
      }
      add(mapped.scaledConstant);
    }
  }
  // In a mixed legend (a data-backed mapping makes the whole scale interactive
  // while a rowless annotation constant shares it), the annotation-only value —
  // one that indexes no rendered mark — would still become a hover/clickable
  // legend entry resolving an empty key bucket. Exclude such values from the
  // legend domain; the scale still trains on them (catalog) so the annotation
  // mark renders. In the all-annotation case (anyIndexable false) the legend is
  // already non-interactive, so nothing is excluded and the entry is preserved.
  const nonInteractiveValues = anyIndexable
    ? annotationConstants.filter((value) => !indexableKeys.has(encodeKey(value)))
    : [];
  return { values, catalog, anyField, anyDiscrete, anyIndexable, nonInteractiveValues };
}
