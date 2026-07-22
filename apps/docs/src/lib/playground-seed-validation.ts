import { validate } from "@ggsvelte/spec";

import {
  fail,
  PLAYGROUND_MAX_DECODED_BYTES,
  PLAYGROUND_MAX_DEPTH,
  PLAYGROUND_MAX_FIELDS,
  PLAYGROUND_MAX_ROWS,
  PLAYGROUND_MAX_STRING_CODE_POINTS,
  type PlaygroundSeedV1,
} from "./playground-codec-contract";

const UNSAFE_FIELDS = new Set(["__proto__", "constructor", "prototype"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function codePointLength(value: string): number {
  return Array.from(value).length;
}

function assertString(value: string): void {
  if (codePointLength(value) > PLAYGROUND_MAX_STRING_CODE_POINTS) {
    fail(
      "STRING_TOO_LONG",
      `Shared playground strings must contain at most ${String(PLAYGROUND_MAX_STRING_CODE_POINTS)} Unicode code points.`,
    );
  }
}

/** Root objects/arrays have depth 1; scalar children do not add another level. */
function assertBoundedTree(value: unknown, depth = 1): void {
  if (typeof value === "string") {
    assertString(value);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  if (depth > PLAYGROUND_MAX_DEPTH) {
    fail(
      "NESTING_TOO_DEEP",
      `Shared playground state must not nest deeper than ${String(PLAYGROUND_MAX_DEPTH)} levels.`,
    );
  }
  if (Array.isArray(value)) {
    for (const child of value) assertBoundedTree(child, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    assertString(key);
    assertBoundedTree(child, depth + 1);
  }
}

function assertSafeField(field: string): void {
  if (UNSAFE_FIELDS.has(field)) {
    fail("UNSAFE_FIELD", `Shared data uses the reserved field name ${JSON.stringify(field)}.`);
  }
}

/** Shared decoded-size check for editor drafts and seed JSON (not re-exported from facade). */
export function assertPlaygroundJsonBytes(source: string, label: string): Uint8Array {
  // ASCII is the cheapest possible UTF-8 representation, so this avoids an
  // allocation for obviously oversized editor input before JSON.parse.
  if (source.length > PLAYGROUND_MAX_DECODED_BYTES) {
    fail(
      "DECODED_TOO_LARGE",
      `${label} must be at most ${String(PLAYGROUND_MAX_DECODED_BYTES / 1024)} KiB.`,
    );
  }
  const bytes = new TextEncoder().encode(source);
  if (bytes.byteLength > PLAYGROUND_MAX_DECODED_BYTES) {
    fail(
      "DECODED_TOO_LARGE",
      `${label} must be at most ${String(PLAYGROUND_MAX_DECODED_BYTES / 1024)} KiB.`,
    );
  }
  return bytes;
}

function inlineDataRecords(spec: Record<string, unknown>): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const addData = (value: unknown): void => {
    if (!isRecord(value)) return;
    if (typeof value["name"] === "string") assertSafeField(value["name"]);
    records.push(value);
  };

  addData(spec["data"]);
  const layers = spec["layers"];
  if (Array.isArray(layers)) {
    for (const layer of layers) {
      if (isRecord(layer)) addData(layer["data"]);
    }
  }
  const datasets = spec["datasets"];
  if (isRecord(datasets)) {
    for (const [name, value] of Object.entries(datasets)) {
      assertSafeField(name);
      addData(value);
    }
  }
  return records;
}

function assertInlineDataBounds(spec: unknown): void {
  if (!isRecord(spec)) return;
  let totalRows = 0;
  for (const data of inlineDataRecords(spec)) {
    if (Array.isArray(data["values"])) {
      const rows = data["values"];
      totalRows += rows.length;
      for (const row of rows) {
        if (!isRecord(row)) continue; // public validate() reports the shape error
        const fields = Object.keys(row);
        if (fields.length > PLAYGROUND_MAX_FIELDS) {
          fail(
            "TOO_MANY_FIELDS",
            `Shared rows may contain at most ${String(PLAYGROUND_MAX_FIELDS)} fields.`,
          );
        }
        for (const field of fields) assertSafeField(field);
      }
    }
    if (isRecord(data["columns"])) {
      const columns = data["columns"];
      const fields = Object.keys(columns);
      if (fields.length > PLAYGROUND_MAX_FIELDS) {
        fail(
          "TOO_MANY_FIELDS",
          `Shared column data may contain at most ${String(PLAYGROUND_MAX_FIELDS)} columns.`,
        );
      }
      for (const field of fields) assertSafeField(field);
      const lengths = fields.map((field) => {
        const column = columns[field];
        return Array.isArray(column) ? column.length : 0;
      });
      if (new Set(lengths).size > 1) {
        fail("RAGGED_COLUMNS", "Shared column data must use columns with equal lengths.");
      }
      totalRows += lengths[0] ?? 0;
    }
  }
  if (totalRows > PLAYGROUND_MAX_ROWS) {
    fail(
      "TOO_MANY_ROWS",
      `Shared playground state may contain at most ${String(PLAYGROUND_MAX_ROWS)} inline rows in total.`,
    );
  }
}

function assertSource(value: unknown): asserts value is PlaygroundSeedV1["source"] {
  if (!isRecord(value) || typeof value["kind"] !== "string") {
    fail("INVALID_SOURCE", "Shared playground state has an invalid source identity.");
  }
  if (value["kind"] === "custom") {
    if (Object.keys(value).length !== 1) {
      fail("INVALID_SOURCE", "A custom playground source cannot contain an id.");
    }
    return;
  }
  if (
    (value["kind"] === "example" || value["kind"] === "sample") &&
    typeof value["id"] === "string" &&
    value["id"].length > 0 &&
    Object.keys(value).length === 2
  ) {
    return;
  }
  fail("INVALID_SOURCE", "Shared playground state has an unknown source identity.");
}

/** Envelope + structural + PortableSpec validation (not re-exported from the facade). */
export function assertPlaygroundSeed(value: unknown): PlaygroundSeedV1 {
  if (!isRecord(value) || !("spec" in value) || !("source" in value) || !("version" in value)) {
    fail("INVALID_SEED", "Shared playground state must contain version, source, and spec.");
  }
  if (value["version"] !== 1) {
    fail("VERSION_MISMATCH", "The fragment version and shared state version do not agree.");
  }
  assertSource(value["source"]);
  assertBoundedTree(value);
  assertInlineDataBounds(value["spec"]);
  const result = validate(value["spec"], {
    limits: {
      maxRows: PLAYGROUND_MAX_ROWS,
      maxBytes: PLAYGROUND_MAX_DECODED_BYTES,
      maxDepth: PLAYGROUND_MAX_DEPTH,
      maxDiagnostics: 100,
    },
  });
  if (!result.ok) {
    fail(
      "INVALID_SPEC",
      "Shared playground state contains an invalid PortableSpec.",
      result.errors,
    );
  }
  if (Object.keys(value).some((key) => !["version", "source", "spec"].includes(key))) {
    fail("INVALID_SEED", "Shared playground state contains unknown envelope fields.");
  }
  return { version: 1, source: value["source"], spec: result.spec };
}

export function assertPlaygroundDraftSize(source: string): void {
  assertPlaygroundJsonBytes(source, "Playground JSON");
}

/**
 * Structural seed validation before wire-size ceilings.
 * Preserves actionable structural reasons (rows, fields, unsafe names) ahead of
 * whole-envelope share-size checks performed by the wire facade.
 */
export function validatePlaygroundSeedContents(seed: PlaygroundSeedV1): PlaygroundSeedV1 {
  assertBoundedTree(seed);
  assertInlineDataBounds(seed.spec);
  assertPlaygroundJsonBytes(JSON.stringify(seed), "Shared playground JSON");
  return assertPlaygroundSeed(seed);
}
