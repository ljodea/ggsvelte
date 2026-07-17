import { encodeKey, type CellValue } from "@ggsvelte/core";

export interface LegendFilterClause {
  readonly scale: "color" | "fill";
  readonly field: string;
  readonly values: readonly CellValue[];
  readonly mode: "exclude" | "include";
}

export interface LegendFilterOptions {
  /** `exclude` stores hidden values; `include` stores shown values. */
  readonly mode?: "exclude" | "include";
  /** Whether several legend entries may remain independently visible. */
  readonly multiple?: boolean;
}

export type LegendFilterInput = boolean | LegendFilterOptions;

export interface LegendFilterEvent {
  readonly type: "legend-filter";
  /** `remove` deletes one clause; `clear` resets the entire filter set. */
  readonly phase: "change" | "remove" | "clear";
  readonly source: "pointer" | "keyboard" | "touch" | "programmatic";
  readonly clause: LegendFilterClause | null;
}

function sameValue(left: CellValue, right: CellValue): boolean {
  return encodeKey(left) === encodeKey(right);
}

export function isLegendValueVisible(
  values: readonly CellValue[],
  value: CellValue,
  mode: "exclude" | "include",
): boolean {
  const present = values.some((candidate) => sameValue(candidate, value));
  return mode === "include" ? present : !present;
}

export function reconcileLegendFilterValues(
  values: readonly CellValue[],
  catalog: readonly CellValue[],
): readonly CellValue[] {
  const catalogKeys = new Set(catalog.map((value) => encodeKey(value)));
  return Object.freeze(values.filter((value) => catalogKeys.has(encodeKey(value))));
}

/** Return the next clause value set for one accessible "Show category" toggle. */
export function nextLegendFilterValues(
  current: readonly CellValue[],
  value: CellValue,
  catalog: readonly CellValue[],
  mode: "exclude" | "include",
  multiple: boolean,
): readonly CellValue[] {
  if (!multiple) {
    return Object.freeze(
      mode === "include" ? [value] : catalog.filter((candidate) => !sameValue(candidate, value)),
    );
  }

  const baseline = current;
  const found = baseline.some((candidate) => sameValue(candidate, value));
  return Object.freeze(
    found ? baseline.filter((candidate) => !sameValue(candidate, value)) : [...baseline, value],
  );
}
