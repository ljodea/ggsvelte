/**
 * Shared helpers for facet partition (field resolution, value order, row match).
 */
import { didYouMean } from "@ggsvelte/spec";
import type { FacetFieldRef } from "@ggsvelte/spec";

import { encodeKey } from "../scales/state.js";
import { bandKey } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { ColumnTable } from "../table.js";

import type { PipelineWarning } from "./types.js";
import { PipelineError } from "./types.js";

export function facetField(
  ref: FacetFieldRef | undefined,
  key: "wrap" | "rows" | "cols",
  table: ColumnTable,
): string | null {
  if (ref === undefined) return null;
  if (!table.has(ref.field)) {
    const suggestion = didYouMean(ref.field, table.fields);
    throw new PipelineError(
      "unknown-field",
      `/facet/${key}`,
      `Unknown facet field "${ref.field}" (available: ${table.fields.join(", ") || "none"}).` +
        (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    );
  }
  return ref.field;
}

/**
 * Authoring key for facet label maps: string form of DomainValue
 * (`"null"` for null; `String(value)` otherwise).
 */
function facetLabelKey(value: CellValue): string {
  if (value === null) return "null";
  return String(value);
}

/** Display strip text: authored labels map, else bandKey(value). */
export function facetDisplayLabel(
  value: CellValue,
  labels: Readonly<Record<string, string>> | undefined,
): string {
  if (labels !== undefined) {
    const key = facetLabelKey(value);
    if (Object.prototype.hasOwnProperty.call(labels, key)) return labels[key]!;
  }
  return bandKey(value);
}

export interface FacetValuesOptions {
  /** Closed explicit order; when set, only these panels exist (empty allowed). */
  levels?: readonly (string | number | boolean | null)[];
  /** Spec path for diagnostics (e.g. `/facet/wrap/levels`). */
  path?: string;
  warnings?: PipelineWarning[];
}

/**
 * Distinct values of a facet column in panel order.
 *
 * Default (no levels): ascending — numeric for quantitative/temporal fields,
 * lexicographic for the rest — with null last (ggplot2's NA panel).
 *
 * With closed `levels`: authored order wins; levels absent from data still
 * produce empty panels; data values omitted from levels are dropped and
 * diagnosed (`facet-levels-missing` / `facet-levels-unknown`).
 */
export function facetValues(
  table: ColumnTable,
  field: string,
  options: FacetValuesOptions = {},
): CellValue[] {
  const { levels, path = `/facet`, warnings } = options;
  const observed = new Map<string, CellValue>();
  for (const v of table.column(field)) {
    const key = encodeKey(v);
    if (!observed.has(key)) observed.set(key, v);
  }

  if (levels !== undefined) {
    const ordered: CellValue[] = [];
    const levelKeys = new Set<string>();
    for (const level of levels) {
      const key = encodeKey(level);
      if (levelKeys.has(key)) continue;
      levelKeys.add(key);
      ordered.push(level);
    }
    if (warnings !== undefined) {
      const missing = ordered
        .filter((level) => !observed.has(encodeKey(level)))
        .map((level) => bandKey(level));
      const unknown = [...observed.entries()]
        .filter(([key]) => !levelKeys.has(key))
        .map(([, value]) => bandKey(value));
      if (missing.length > 0) {
        warnings.push({
          code: "facet-levels-missing",
          message:
            `Facet field "${field}" lists levels absent from the data (${missing.join(", ")}); ` +
            `empty panels are kept at path ${path}.`,
        });
      }
      if (unknown.length > 0) {
        warnings.push({
          code: "facet-levels-unknown",
          message:
            `Facet field "${field}" observed values omitted from closed levels (${unknown.join(", ")}); ` +
            `those rows are excluded from every panel at path ${path}.`,
        });
      }
    }
    return ordered;
  }

  const values = [...observed.values()];
  const numeric = table.fieldType(field) !== "nominal";
  const numericByKey = new Map<string, number>();
  if (numeric) {
    const semantic = table.numeric(field);
    const column = table.column(field);
    for (let index = 0; index < column.length; index++) {
      const key = encodeKey(column[index]!);
      if (!numericByKey.has(key)) numericByKey.set(key, semantic[index]!);
    }
  }
  values.sort((a, b) => {
    if (a === null) return b === null ? 0 : 1;
    if (b === null) return -1;
    if (numeric) return numericByKey.get(encodeKey(a))! - numericByKey.get(encodeKey(b))!;
    const ka = bandKey(a);
    const kb = bandKey(b);
    if (ka === kb) return encodeKey(a).localeCompare(encodeKey(b), "en");
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return values;
}
