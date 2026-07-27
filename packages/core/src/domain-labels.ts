/**
 * Scale-domain presentation labels.
 *
 * Typed domain values can share a `bandKey` string (`1` and `"1"`). Callers that
 * show those values as UI labels (legends, bounds editors, discrete guides)
 * need collision-qualified strings so options stay distinguishable.
 */

import { bandKey } from "./scales/train.js";

function valueKind(value: unknown): string {
  if (value instanceof Date) return "date";
  if (value === null) return "null";
  if (typeof value === "string") return "text";
  return typeof value;
}

/**
 * Map domain values to presentation labels. Unique band keys stay bare;
 * collisions get a `(kind)` suffix from the source value's runtime type.
 */
export function disambiguatedLabels(values: readonly unknown[]): string[] {
  const raw = values.map((value) => bandKey(value));
  const counts = new Map<string, number>();
  for (const label of raw) counts.set(label, (counts.get(label) ?? 0) + 1);
  return raw.map((label, index) =>
    (counts.get(label) ?? 0) > 1 ? `${label} (${valueKind(values[index])})` : label,
  );
}
