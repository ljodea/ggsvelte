export const PLAYGROUND_MAX_BYTES = 256 * 1024;
export const PLAYGROUND_MAX_ROWS = 5_000;
export const PLAYGROUND_MAX_FIELDS = 50;
export const PLAYGROUND_MAX_FIELD_NAME_LENGTH = 128;
export const PLAYGROUND_MAX_STRING_LENGTH = 10_000;

const UNSAFE_FIELDS = new Set(["__proto__", "constructor", "prototype"]);

export type PlaygroundCell = string | number | boolean | null;
export type PlaygroundRow = Record<string, PlaygroundCell>;
export type PlaygroundFieldKind = "number" | "text" | "boolean";

export interface PlaygroundField {
  name: string;
  kind: PlaygroundFieldKind;
}

export interface RecommendedPlaygroundFields {
  x: string;
  y: string;
  color: string;
  key: string;
}

export interface ParsedPlaygroundData {
  format: "json";
  rows: PlaygroundRow[];
}

export type PlaygroundDataErrorCode =
  | "EMPTY_INPUT"
  | "INPUT_TOO_LARGE"
  | "INVALID_JSON"
  | "INVALID_ROOT"
  | "EMPTY_DATA"
  | "TOO_MANY_ROWS"
  | "INVALID_ROW"
  | "TOO_MANY_FIELDS"
  | "INVALID_FIELD"
  | "UNSAFE_FIELD"
  | "INVALID_CELL"
  | "STRING_TOO_LONG";

export class PlaygroundDataError extends Error {
  readonly code: PlaygroundDataErrorCode;
  readonly fix: string;

  constructor(code: PlaygroundDataErrorCode, message: string, fix: string) {
    super(message);
    this.name = "PlaygroundDataError";
    this.code = code;
    this.fix = fix;
  }
}

function fail(code: PlaygroundDataErrorCode, message: string, fix: string): never {
  throw new PlaygroundDataError(code, message, fix);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function copyRow(value: unknown, rowIndex: number): PlaygroundRow {
  if (!isRecord(value)) {
    fail(
      "INVALID_ROW",
      `Row ${String(rowIndex + 1)} must be a JSON object.`,
      "Wrap each row in braces with named fields, then apply the data again.",
    );
  }

  const entries = Object.entries(value);
  if (entries.length > PLAYGROUND_MAX_FIELDS) {
    fail(
      "TOO_MANY_FIELDS",
      `Row ${String(rowIndex + 1)} has too many fields; the playground limit is ${String(PLAYGROUND_MAX_FIELDS)}.`,
      "Keep only the fields needed for this chart.",
    );
  }

  const row: PlaygroundRow = {};
  for (const [field, cell] of entries) {
    if (field.length === 0) {
      fail(
        "INVALID_FIELD",
        `Row ${String(rowIndex + 1)} field names cannot be empty.`,
        "Give every field a short, visible name and apply the data again.",
      );
    }
    if (field.length > PLAYGROUND_MAX_FIELD_NAME_LENGTH) {
      fail(
        "INVALID_FIELD",
        `Row ${String(rowIndex + 1)} field name is too long; the playground limit is ${String(PLAYGROUND_MAX_FIELD_NAME_LENGTH)} characters.`,
        "Shorten the field name and apply the data again.",
      );
    }
    if (/\p{Cc}/u.test(field)) {
      fail(
        "INVALID_FIELD",
        `Row ${String(rowIndex + 1)} field names cannot contain control characters.`,
        "Remove line breaks and other control characters from field names.",
      );
    }
    if (UNSAFE_FIELDS.has(field)) {
      fail(
        "UNSAFE_FIELD",
        `Row ${String(rowIndex + 1)} uses the reserved field name ${JSON.stringify(field)}.`,
        "Rename the field and apply the data again.",
      );
    }
    if (
      cell !== null &&
      typeof cell !== "string" &&
      typeof cell !== "number" &&
      typeof cell !== "boolean"
    ) {
      fail(
        "INVALID_CELL",
        `Row ${String(rowIndex + 1)} field ${JSON.stringify(field)} must be a string, number, boolean, or null.`,
        "Flatten nested values into ordinary fields before applying the data.",
      );
    }
    if (typeof cell === "number" && !Number.isFinite(cell)) {
      fail(
        "INVALID_CELL",
        `Row ${String(rowIndex + 1)} field ${JSON.stringify(field)} must be a finite number.`,
        "Replace infinity or NaN with a finite number or null.",
      );
    }
    if (typeof cell === "string" && cell.length > PLAYGROUND_MAX_STRING_LENGTH) {
      fail(
        "STRING_TOO_LONG",
        `Row ${String(rowIndex + 1)} field ${JSON.stringify(field)} is too long.`,
        `Shorten the value to ${String(PLAYGROUND_MAX_STRING_LENGTH)} characters or fewer.`,
      );
    }
    row[field] = cell;
  }
  return row;
}

/** Parse bounded, local-only JSON rows. This function never evaluates code. */
export function parsePlaygroundData(source: string): ParsedPlaygroundData {
  // A UTF-16 code unit is never smaller than one UTF-8 byte. Reject obviously
  // oversized strings before allocating a trimmed copy or encoded byte array.
  if (source.length > PLAYGROUND_MAX_BYTES) {
    fail(
      "INPUT_TOO_LARGE",
      `The pasted data is too large; the playground limit is ${String(PLAYGROUND_MAX_BYTES / 1024)} KiB.`,
      "Use a smaller sample locally; the playground does not upload or stream data.",
    );
  }
  const bytes = new TextEncoder().encode(source).byteLength;
  if (bytes > PLAYGROUND_MAX_BYTES) {
    fail(
      "INPUT_TOO_LARGE",
      `The pasted data is too large; the playground limit is ${String(PLAYGROUND_MAX_BYTES / 1024)} KiB.`,
      "Use a smaller sample locally; the playground does not upload or stream data.",
    );
  }
  const trimmed = source.trim();
  if (trimmed === "") {
    fail(
      "EMPTY_INPUT",
      "Paste a JSON array of rows before applying data.",
      'Try the sample format: [{"x": 1, "y": 2}].',
    );
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(trimmed) as unknown;
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message.replace(/^JSON Parse error:\s*/u, "").slice(0, 180)
        : "";
    fail(
      "INVALID_JSON",
      `The pasted data is not valid JSON${detail === "" ? "." : `: ${detail}`}`,
      "Check quotes, commas, and brackets, then apply the data again.",
    );
  }

  if (!Array.isArray(decoded)) {
    fail(
      "INVALID_ROOT",
      "JSON data must be an array of row objects.",
      'Wrap the rows in square brackets: [{"x": 1, "y": 2}].',
    );
  }
  if (decoded.length === 0) {
    fail("EMPTY_DATA", "JSON data needs at least one row.", "Add one or more row objects.");
  }
  if (decoded.length > PLAYGROUND_MAX_ROWS) {
    fail(
      "TOO_MANY_ROWS",
      `The dataset has too many rows; the playground limit is ${String(PLAYGROUND_MAX_ROWS)}.`,
      "Use a representative sample for the browser playground.",
    );
  }

  return {
    format: "json",
    rows: decoded.map((row, index) => copyRow(row, index)),
  };
}

/** Preserve first-seen field order and infer only the kinds needed by controls. */
export function inferPlaygroundFields(rows: readonly PlaygroundRow[]): PlaygroundField[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const name of Object.keys(row)) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
  }

  return names.map((name) => {
    const values = rows
      .map((row) => row[name])
      .filter((value) => value !== null && value !== undefined);
    const kind: PlaygroundFieldKind =
      values.length > 0 && values.every((value) => typeof value === "number")
        ? "number"
        : values.length > 0 && values.every((value) => typeof value === "boolean")
          ? "boolean"
          : "text";
    return { name, kind };
  });
}

export function recommendPlaygroundFields(
  fields: readonly PlaygroundField[],
): RecommendedPlaygroundFields {
  const numbers = fields.filter((field) => field.kind === "number");
  const categories = fields.filter((field) => field.kind !== "number");
  const x =
    numbers.length >= 2
      ? (numbers[0]?.name ?? "")
      : (categories.find((field) => field.name !== "id")?.name ?? fields[0]?.name ?? "");
  const y =
    numbers.length > 0
      ? (numbers[Math.min(1, numbers.length - 1)]?.name ?? "")
      : (fields[1]?.name ?? x);
  return {
    x,
    y,
    color: categories.find((field) => field.name !== "id")?.name ?? "",
    key: fields.find((field) => field.name === "id")?.name ?? "",
  };
}
