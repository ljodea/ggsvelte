/**
 * Builder/Svelte authoring data conversion.
 *
 * Accepts rows, columns, or named DataRef forms with Date cells; snapshots
 * inputs immutably for `gg()`; and materializes portable CellValue data
 * (ISO date/datetime strings) for `.spec()`. Geom sugar and GGBuilder live
 * in builder.ts.
 */

import type { AesInput } from "./normalize.js";
import type { CellValue, DataRef, Scales } from "./schema.js";

/** A builder/Svelte data cell. Dates canonicalize to ISO before validation. */
export type AuthoringCellValue = CellValue | Date;
export type AuthoringRows = readonly Readonly<Record<string, AuthoringCellValue>>[];
export type AuthoringColumns = Readonly<Record<string, readonly AuthoringCellValue[]>>;
export type AuthoringDataRef =
  | { values: AuthoringRows }
  | { columns: AuthoringColumns }
  | { name: string };

/** Data accepted by gg(): authoring rows, columns, or a data reference. */
export type DataInput = AuthoringRows | AuthoringColumns | AuthoringDataRef;

function isDataRef(data: DataInput): data is AuthoringDataRef {
  if (Array.isArray(data)) return false;
  const keys = Object.keys(data);
  if (keys.length !== 1) return false;
  const key = keys[0]!;
  if (key === "name") return typeof (data as { name: unknown }).name === "string";
  if (key === "values") return Array.isArray((data as { values: unknown }).values);
  if (key === "columns") {
    const columns = (data as { columns: unknown }).columns;
    return typeof columns === "object" && columns !== null && !Array.isArray(columns);
  }
  return false;
}

function snapshotCell(value: AuthoringCellValue): AuthoringCellValue {
  return value instanceof Date ? new Date(value.getTime()) : value;
}

function snapshotRows(rows: AuthoringRows): Record<string, AuthoringCellValue>[] {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, snapshotCell(value)])),
  );
}

function snapshotColumns(columns: AuthoringColumns): Record<string, AuthoringCellValue[]> {
  return Object.fromEntries(
    Object.entries(columns).map(([key, values]) => [
      key,
      values.map((value) => snapshotCell(value)),
    ]),
  );
}

export function toAuthoringDataRef(data: DataInput): AuthoringDataRef {
  if (Array.isArray(data)) return { values: snapshotRows(data as AuthoringRows) };
  if (isDataRef(data)) {
    if ("name" in data) return data;
    if ("values" in data) return { values: snapshotRows(data.values) };
    return { columns: snapshotColumns(data.columns) };
  }
  return { columns: snapshotColumns(data as AuthoringColumns) };
}

function portableCell(value: AuthoringCellValue, calendarDate: boolean): CellValue {
  if (!(value instanceof Date)) return value;
  const iso = value.toISOString();
  return calendarDate ? iso.slice(0, 10) : iso;
}

function portableRows(
  rows: AuthoringRows,
  calendarFields: ReadonlySet<string>,
): Record<string, CellValue>[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        portableCell(value, calendarFields.has(key)),
      ]),
    ),
  );
}

function portableColumns(
  columns: AuthoringColumns,
  calendarFields: ReadonlySet<string>,
): Record<string, CellValue[]> {
  return Object.fromEntries(
    Object.entries(columns).map(([key, values]) => [
      key,
      values.map((value) => portableCell(value, calendarFields.has(key))),
    ]),
  );
}

export function toDataRef(data: AuthoringDataRef, calendarFields: ReadonlySet<string>): DataRef {
  if ("name" in data) return data;
  if ("values" in data) return { values: portableRows(data.values, calendarFields) };
  return { columns: portableColumns(data.columns, calendarFields) };
}

function mappedField(value: AesInput[keyof AesInput]): string | null {
  if (typeof value === "string") return value;
  return value !== undefined && value !== null && "field" in value ? value.field : null;
}

/** Minimal state slice needed to decide calendar-date ISO truncation. */
export interface BuilderCalendarSource {
  readonly aes?: AesInput;
  readonly layers: readonly { readonly aes?: AesInput }[];
  readonly scales?: Scales;
}

/** Fields mapped on scales with temporalKind "date" (calendar ISO date cells). */
export function calendarDateFields(state: BuilderCalendarSource): ReadonlySet<string> {
  const fields = new Set<string>();
  const mappings = [
    ["x", ["x", "xmin", "xmax", "xend"]],
    ["y", ["y", "ymin", "ymax", "yend"]],
    ["color", ["color"]],
    ["fill", ["fill"]],
    ["size", ["size"]],
    ["linewidth", ["linewidth"]],
    ["alpha", ["alpha"]],
  ] as const;
  for (const [scale, channels] of mappings) {
    if (state.scales?.[scale]?.temporalKind !== "date") continue;
    for (const channel of channels) {
      const plotField = mappedField(state.aes?.[channel]);
      if (plotField !== null) fields.add(plotField);
      for (const layer of state.layers) {
        const layerField = mappedField(layer.aes?.[channel]);
        if (layerField !== null) fields.add(layerField);
      }
    }
  }
  return fields;
}
