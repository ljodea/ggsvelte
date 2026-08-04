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
    // Field-mapped or after_stat color/fill (e.g. bin_2d fill = count): values
    // live on the frame. One push only — do not dual-loop statColumn rows.
    if (frameValues !== null && (channel.field !== null || (channel.statColumn ?? null) !== null)) {
      anyField = true;
      if (
        channel.field !== null &&
        table.has(channel.field) &&
        table.discreteness(channel.field) === "discrete"
      ) {
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

/**
 * Frame-level mapping flags without materializing per-row values.
 * Ordinal training uses the source catalog; sequential still needs the full
 * values array from {@link collectColorChannelValues}.
 */
export function collectColorChannelFlags(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
  table: ColumnTable,
): { anyDiscreteField: boolean; anyField: boolean } {
  let anyDiscreteField = false;
  let anyField = false;
  for (const frame of frames) {
    const channel = name === "color" ? frame.binding.color : frame.binding.fill;
    const frameValues = name === "color" ? frame.colorValues : frame.fillValues;
    if (frameValues !== null && (channel.field !== null || (channel.statColumn ?? null) !== null)) {
      anyField = true;
      if (
        channel.field !== null &&
        table.has(channel.field) &&
        table.discreteness(channel.field) === "discrete"
      ) {
        anyDiscreteField = true;
      }
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
    }
  }
  return { anyDiscreteField, anyField };
}

/** Count null cells on the mapped color/fill channel (NA-color warning). */
export function countNullColorChannelValues(
  name: "color" | "fill",
  frames: readonly LayerFrame[],
): number {
  let missing = 0;
  for (const frame of frames) {
    const channel = name === "color" ? frame.binding.color : frame.binding.fill;
    const frameValues = name === "color" ? frame.colorValues : frame.fillValues;
    if (frameValues !== null && (channel.field !== null || (channel.statColumn ?? null) !== null)) {
      for (let i = 0; i < frameValues.length; i++) {
        if (frameValues[i] === null) missing++;
      }
    }
  }
  return missing;
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
    // Monomorphic strings (series labels): Set membership on the string
    // itself — encodeKey for plain strings is identity, but the call +
    // startsWith("@") check still costs at 30k cells.
    if (typeof value === "string" && !value.startsWith("@")) {
      if (catalogKeys.has(value)) return;
      catalogKeys.add(value);
      catalogValues.push(value);
      return;
    }
    const key = encodeKey(value);
    if (catalogKeys.has(key)) return;
    catalogKeys.add(key);
    catalogValues.push(value);
  };
  let anyDiscreteField = false;
  let anyField = false;
  for (const binding of bindings) {
    const channel = name === "color" ? binding.color : binding.fill;
    // Multi-table: each layer contributes from its own source (#589).
    const table = binding.sourceTable ?? catalogTable;
    if (channel.field !== null && table.has(channel.field)) {
      anyField = true;
      if (table.discreteness(channel.field) === "discrete") anyDiscreteField = true;
      for (const value of table.column(channel.field)) addCatalogValue(value);
    }
    if (channel.scaledConstant !== null) {
      anyDiscreteField = true;
      anyField = true;
      addCatalogValue(channel.scaledConstant);
    }
  }
  return { catalogValues, anyDiscreteField, anyField };
}
