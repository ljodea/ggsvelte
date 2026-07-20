import { validate, type PortableSpec, type SpecError } from "@ggsvelte/spec";

export const PLAYGROUND_MAX_ENCODED_LENGTH = 16 * 1024;
export const PLAYGROUND_MAX_DECODED_BYTES = 12 * 1024;
export const PLAYGROUND_MAX_DEPTH = 8;
export const PLAYGROUND_MAX_ROWS = 500;
export const PLAYGROUND_MAX_FIELDS = 64;
export const PLAYGROUND_MAX_STRING_CODE_POINTS = 2_048;

const HASH_PREFIX = "#play=";
const PAYLOAD_PREFIX = "v1.";
const UNSAFE_FIELDS = new Set(["__proto__", "constructor", "prototype"]);

export interface PlaygroundSeedV1 {
  readonly version: 1;
  readonly source:
    | { readonly kind: "example"; readonly id: string }
    | { readonly kind: "sample"; readonly id: string }
    | { readonly kind: "custom" };
  readonly spec: PortableSpec;
}

export type PlaygroundCompatibility =
  | {
      readonly supported: true;
      readonly seed: PlaygroundSeedV1;
      readonly fragment: string;
    }
  | { readonly supported: false; readonly reason: string };

export type PlaygroundCodecErrorCode =
  | "UNKNOWN_VERSION"
  | "ENCODED_TOO_LARGE"
  | "INVALID_BASE64URL"
  | "DECODED_TOO_LARGE"
  | "INVALID_UTF8"
  | "INVALID_JSON"
  | "INVALID_SEED"
  | "VERSION_MISMATCH"
  | "INVALID_SOURCE"
  | "NESTING_TOO_DEEP"
  | "STRING_TOO_LONG"
  | "TOO_MANY_ROWS"
  | "TOO_MANY_FIELDS"
  | "RAGGED_COLUMNS"
  | "UNSAFE_FIELD"
  | "INVALID_SPEC";

export class PlaygroundCodecError extends Error {
  readonly code: PlaygroundCodecErrorCode;
  readonly diagnostics: readonly SpecError[];

  constructor(
    code: PlaygroundCodecErrorCode,
    message: string,
    diagnostics: readonly SpecError[] = [],
  ) {
    super(message);
    this.name = "PlaygroundCodecError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export type DecodePlaygroundHashResult =
  | { readonly status: "absent" }
  | { readonly status: "ok"; readonly seed: PlaygroundSeedV1 }
  | { readonly status: "error"; readonly error: PlaygroundCodecError };

function fail(
  code: PlaygroundCodecErrorCode,
  message: string,
  diagnostics: readonly SpecError[] = [],
): never {
  throw new PlaygroundCodecError(code, message, diagnostics);
}

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

function assertJsonByteLength(source: string, label: string): Uint8Array {
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

function assertSeed(value: unknown): PlaygroundSeedV1 {
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

function bytesToBase64Url(bytes: Uint8Array): string {
  const encoded = btoa(String.fromCodePoint(...bytes));
  return encoded.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(payload: string): Uint8Array {
  if (payload.length === 0 || payload.length % 4 === 1 || !/^[A-Za-z0-9_-]+$/u.test(payload)) {
    fail("INVALID_BASE64URL", "The shared playground payload is not canonical base64url.");
  }
  const standard = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = standard.padEnd(Math.ceil(standard.length / 4) * 4, "=");
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    fail("INVALID_BASE64URL", "The shared playground payload is not valid base64url.");
  }
  const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0);
  if (bytesToBase64Url(bytes) !== payload) {
    fail("INVALID_BASE64URL", "The shared playground payload uses noncanonical trailing bits.");
  }
  return bytes;
}

export function assertPlaygroundDraftSize(source: string): void {
  assertJsonByteLength(source, "Playground JSON");
}

export function validatePlaygroundSeed(seed: PlaygroundSeedV1): PlaygroundSeedV1 {
  // Preserve the most actionable structural reason (rows, fields, unsafe
  // names) before applying the whole-envelope share-size ceiling.
  assertBoundedTree(seed);
  assertInlineDataBounds(seed.spec);
  assertJsonByteLength(JSON.stringify(seed), "Shared playground JSON");
  const bounded = assertSeed(seed);
  const payload = bytesToBase64Url(
    assertJsonByteLength(JSON.stringify(bounded), "Shared playground JSON"),
  );
  if (payload.length > PLAYGROUND_MAX_ENCODED_LENGTH) {
    fail(
      "ENCODED_TOO_LARGE",
      `Shared playground payloads must be at most ${String(PLAYGROUND_MAX_ENCODED_LENGTH / 1024)} KiB.`,
    );
  }
  return bounded;
}

export function encodePlaygroundSeed(seed: PlaygroundSeedV1): string {
  const bounded = validatePlaygroundSeed(seed);
  const bytes = new TextEncoder().encode(JSON.stringify(bounded));
  return `${HASH_PREFIX}${PAYLOAD_PREFIX}${bytesToBase64Url(bytes)}`;
}

export function decodePlaygroundHash(hash: string): DecodePlaygroundHashResult {
  if (!hash.startsWith(HASH_PREFIX)) return { status: "absent" };
  try {
    const payloadWithVersion = hash.slice(HASH_PREFIX.length);
    const separator = payloadWithVersion.indexOf(".");
    if (separator === -1 || payloadWithVersion.slice(0, separator) !== "v1") {
      fail("UNKNOWN_VERSION", "This shared playground version is not supported.");
    }
    const payload = payloadWithVersion.slice(separator + 1);
    if (payload.length > PLAYGROUND_MAX_ENCODED_LENGTH) {
      fail(
        "ENCODED_TOO_LARGE",
        `Shared playground payloads must be at most ${String(PLAYGROUND_MAX_ENCODED_LENGTH / 1024)} KiB.`,
      );
    }
    const bytes = base64UrlToBytes(payload);
    if (bytes.byteLength > PLAYGROUND_MAX_DECODED_BYTES) {
      fail(
        "DECODED_TOO_LARGE",
        `Shared playground JSON must be at most ${String(PLAYGROUND_MAX_DECODED_BYTES / 1024)} KiB.`,
      );
    }
    let json: string;
    try {
      json = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      fail("INVALID_UTF8", "The shared playground payload is not valid UTF-8.");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(json) as unknown;
    } catch {
      fail("INVALID_JSON", "The shared playground payload is not valid JSON.");
    }
    return { status: "ok", seed: assertSeed(parsed) };
  } catch (error) {
    return {
      status: "error",
      error:
        error instanceof PlaygroundCodecError
          ? error
          : new PlaygroundCodecError("INVALID_SEED", "The shared playground state is invalid."),
    };
  }
}
