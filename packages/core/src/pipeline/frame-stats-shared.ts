/**
 * Shared helpers for non-identity LayerFrame construction.
 */
import type { CellValue } from "../table.js";

import type { LayerBinding } from "./types.js";

export type CarriedColumnOf = (
  result: { carried: Record<string, CellValue[]> },
  x: readonly CellValue[] | null,
) => (field: string | null) => readonly CellValue[] | null;

export function makeColumnOf(binding: LayerBinding): CarriedColumnOf {
  return (result, x) => (field) =>
    field === null ? null : field === binding.xField ? x : (result.carried[field] ?? null);
}
