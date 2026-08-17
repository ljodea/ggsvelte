/**
 * ColumnTable — the pipeline's columnar data container.
 *
 * Temporal meaning is owned by @ggsvelte/spec's strict parser registry. A
 * ColumnTable caches immutable parsed views by field + parser semantics;
 * subsets gather parent views so filters/facets never reclassify or reparse.
 *
 * Free helpers live in table-coerce.ts; public types in table-types.ts.
 * This module re-exports both for a stable `./table.js` import path.
 */
import type { TemporalParserSpec } from "@ggsvelte/spec";

import {
  COLUMN_TRANSFORM_EVENT,
  type ColumnTransformConfig,
  executeColumnTransform,
} from "./scales/transform.js";
import {
  cellsToNumeric,
  cellsToQuantitative,
  discretenessOf,
  nonTemporalFieldType,
} from "./table-coerce.js";
import { isIsoLikeString, isoHasClock } from "./iso-epoch.js";
import { getTemporalRuntime, temporalRuntimeGeneration } from "./temporal-runtime.js";
import type {
  CellValue,
  Columns,
  Discreteness,
  FieldType,
  ParsedColumnOptions,
  ParsedColumnView,
  Rows,
  TransformedColumnView,
} from "./table-types.js";

export type {
  CellValue,
  Columns,
  Discreteness,
  FieldType,
  ParsedColumnOptions,
  ParsedColumnView,
  Rows,
  TransformedColumnView,
} from "./table-types.js";
export {
  cellToNumber,
  cellsToNumeric,
  cellsToQuantitative,
  discretenessOf,
  inferFieldType,
  isISODateString,
} from "./table-coerce.js";

function transformConfigKey(config: ColumnTransformConfig): string {
  const limits =
    config.sourceLimits === null ? "none" : `${config.sourceLimits[0]},${config.sourceLimits[1]}`;
  const na = config.naValue === null ? "null" : String(config.naValue);
  return `${config.transform.key}|${limits}|${config.oob}|${na}`;
}

function optionsKey(options: ParsedColumnOptions): string {
  return [
    options.timezone ?? "UTC",
    options.disambiguation ?? "reject",
    options.failurePolicy ?? "error",
    options.inferTemporal === false ? "numeric-only" : "infer-temporal",
  ].join("|");
}

function requestKey(parser: TemporalParserSpec | "auto", options: ParsedColumnOptions): string {
  const runtime = getTemporalRuntime();
  let parserPart = "auto";
  if (parser !== "auto") {
    parserPart = runtime === null ? JSON.stringify(parser) : runtime.parserKey(parser);
  }
  // Include runtime generation so lite→full install does not reuse lean caches.
  return `${parserPart}|rt${String(temporalRuntimeGeneration())}|${optionsKey(options)}`;
}

/** Polyfill-free auto parse for the lean render entry. */
function liteParseColumn(
  raw: readonly CellValue[],
  parser: TemporalParserSpec | "auto",
  options: ParsedColumnOptions,
): {
  decision: ParsedColumnView["decision"];
  semantic: Float64Array;
  valid: Uint8Array;
  kind: ParsedColumnView["temporalKind"];
  precision: ParsedColumnView["temporalPrecision"];
} {
  if (parser !== "auto") {
    throw new Error(
      `Explicit temporal parser ${JSON.stringify(parser)} requires @ggsvelte/core (full) or @ggsvelte/core/temporal.`,
    );
  }
  const inferTemporal = options.inferTemporal !== false;
  if (!inferTemporal) {
    const { semantic, valid, nonNullCount } = fallbackNumeric(raw, false);
    return {
      decision: {
        status: "nominal",
        parser: null,
        parserKey: "lite:numeric-only",
        kind: null,
        precision: null,
        evidence: [],
        nonNullCount,
        validatedCount: 0,
        failedCount: 0,
        candidates: [],
      },
      semantic,
      valid,
      kind: undefined,
      precision: undefined,
    };
  }
  // Single pass: classify the column and count non-nulls. Pure number columns
  // (the competitive x/y path) and pure non-ISO string columns (color/group
  // series labels) take monomorphic fast paths that skip ISO coercion.
  let nonNullCount = 0;
  let isoCount = 0;
  let stringCount = 0;
  let sawClock = false;
  let sawNumber = false;
  let sawNumericLookingString = false;
  let blockingNonString = false;
  let allNumberOrNull = true;
  for (const value of raw) {
    if (value === null) continue;
    nonNullCount++;
    if (typeof value === "number") {
      sawNumber = true;
      continue;
    }
    allNumberOrNull = false;
    if (typeof value === "string") {
      stringCount++;
      if (isIsoLikeString(value)) {
        isoCount++;
        if (isoHasClock(value)) sawClock = true;
      } else if (stringLooksNumeric(value)) {
        // "10" / " 3.5" must stay on cellsToNumeric (Number coercion), not the
        // all-NaN label path — lean and full runtime must agree (#1468 review).
        sawNumericLookingString = true;
      }
      continue;
    }
    if (value instanceof Date && Number.isFinite(value.getTime())) continue;
    blockingNonString = true;
  }

  if (allNumberOrNull) {
    const { semantic, valid } = pureNumberSemantic(raw);
    return {
      decision: {
        status: "nominal",
        parser: null,
        // Distinct key so fieldType can classify without re-scanning (and
        // without a first-cell probe that mis-types Date / mixed columns).
        parserKey: "lite:numbers",
        kind: null,
        precision: null,
        evidence: [],
        nonNullCount,
        validatedCount: 0,
        failedCount: 0,
        candidates: [],
      },
      semantic,
      valid,
      kind: undefined,
      precision: undefined,
    };
  }

  // Detect ISO-like string columns without the Temporal polyfill.
  // Every non-null cell must be an ISO-like string (or a finite Date); a
  // mixed column such as ["2024-01-01", 5] must not become temporal — numbers
  // would coerce to epoch ms near 1970 (parity with inferFieldType lean path
  // and the full temporal runtime, which fails non-ISO cells).
  // `sawNumber` is the original blockingNonString path for numbers, kept
  // separate so pure-number columns can take the monomorphic fast path above.
  const temporal = !blockingNonString && !sawNumber && stringCount > 0 && isoCount === stringCount;
  if (!temporal) {
    // Pure non-ISO *label* strings (series names): semantic is all-NaN — skip
    // cellsToNumeric. Numeric text ("10") is NOT a label path.
    const pureNonIsoLabelStrings =
      !blockingNonString &&
      !sawNumber &&
      !sawNumericLookingString &&
      stringCount > 0 &&
      isoCount === 0 &&
      stringCount === nonNullCount;
    const { semantic, valid } = pureNonIsoLabelStrings
      ? allInvalidSemantic(raw.length)
      : fallbackNumeric(raw, true);
    return {
      decision: {
        status: "nominal",
        parser: null,
        // lite:labels = pure non-ISO strings; lite:auto = mixed / numeric-text
        // (fieldType must fall back to nonTemporalFieldType for the latter).
        parserKey: pureNonIsoLabelStrings ? "lite:labels" : "lite:auto",
        kind: null,
        precision: null,
        evidence: [],
        nonNullCount,
        validatedCount: 0,
        failedCount: 0,
        candidates: [],
      },
      semantic,
      valid,
      kind: undefined,
      precision: undefined,
    };
  }
  const semantic = cellsToNumeric(raw);
  const valid = new Uint8Array(raw.length);
  let validatedCount = 0;
  for (let index = 0; index < semantic.length; index++) {
    if (Number.isFinite(semantic[index]!)) {
      valid[index] = 1;
      validatedCount++;
    }
  }
  const kind = sawClock ? "datetime" : "date";
  const precision = sawClock ? "second" : "date";
  // Evidence is a short sample of non-null raw cells (not a full filter copy).
  const evidence: (string | number | boolean | null)[] = [];
  for (let i = 0; i < raw.length && evidence.length < 5; i++) {
    const value = raw[i]!;
    if (value !== null) evidence.push(value as string | number | boolean | null);
  }
  return {
    decision: {
      status: "temporal",
      parser: "iso",
      parserKey: "lite:iso",
      kind,
      precision,
      evidence,
      nonNullCount,
      validatedCount,
      failedCount: nonNullCount - validatedCount,
      candidates: ["iso"],
    },
    semantic,
    valid,
    kind,
    precision,
  };
}

/** Number-or-null columns: direct Float64 copy, no ISO/string branches. */
function pureNumberSemantic(raw: readonly CellValue[]): {
  semantic: Float64Array;
  valid: Uint8Array;
} {
  const semantic = new Float64Array(raw.length);
  const valid = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    const value = raw[index]!;
    if (typeof value === "number") {
      semantic[index] = value;
      if (Number.isFinite(value)) valid[index] = 1;
    } else {
      semantic[index] = Number.NaN;
    }
  }
  return { semantic, valid };
}

/** Nominal string labels: all-invalid semantic (no per-cell coercion). */
function allInvalidSemantic(length: number): { semantic: Float64Array; valid: Uint8Array } {
  const semantic = new Float64Array(length);
  semantic.fill(Number.NaN);
  return { semantic, valid: new Uint8Array(length) };
}

/**
 * True when a non-ISO string might still coerce via Number() (CSV-ish numeric
 * text). Labels like "s0" / "series-1" are false (letter first after trim).
 */
function stringLooksNumeric(value: string): boolean {
  const first = value.codePointAt(0);
  // Most nominal labels start with printable ASCII ("s0", "series-1").
  // Decide those without allocating a trimmed copy; keep the full trim path
  // for leading whitespace and non-ASCII input.
  if (first !== undefined && first > 0x20 && first < 0x7f) {
    return (first >= 48 && first <= 57) || first === 43 || first === 45 || first === 46;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  const c0 = trimmed.codePointAt(0);
  if (c0 === undefined) return false;
  // digit, '+', '-', '.'
  return (c0 >= 48 && c0 <= 57) || c0 === 43 || c0 === 45 || c0 === 46;
}

/**
 * Map monomorphic lean parse keys to field types without re-scanning.
 * Returns null for `lite:auto` (mixed / numeric-text / Dates) so the caller
 * runs {@link nonTemporalFieldType} — a first-cell probe would mis-type pure
 * Date columns as nominal and mixed number/text as quantitative (#1477 review).
 */
function fieldTypeFromLiteDecision(decision: ParsedColumnView["decision"]): FieldType | null {
  switch (decision.parserKey) {
    case "lite:numbers":
    case "lite:numeric-only":
      return "quantitative";
    case "lite:labels":
      return "nominal";
    default:
      return null;
  }
}

function fallbackNumeric(
  raw: readonly CellValue[],
  inferTemporal: boolean,
): { semantic: Float64Array; valid: Uint8Array; nonNullCount: number } {
  const semantic = inferTemporal ? cellsToNumeric(raw) : cellsToQuantitative(raw);
  const valid = new Uint8Array(raw.length);
  let nonNullCount = 0;
  for (let index = 0; index < semantic.length; index++) {
    if (raw[index] !== null) nonNullCount++;
    if (Number.isFinite(semantic[index]!)) valid[index] = 1;
  }
  return { semantic, valid, nonNullCount };
}
export class ColumnTable {
  readonly #columns: Record<string, readonly CellValue[]>;
  readonly #rowCount: number;
  readonly #parsedCache = new Map<string, ParsedColumnView>();
  readonly #transformedCache = new Map<string, TransformedColumnView>();
  readonly #typeCache = new Map<string, FieldType>();
  readonly #parent: ColumnTable | null;
  readonly #parentRows: readonly number[] | Uint32Array | null;

  private constructor(
    columns: Record<string, readonly CellValue[]>,
    rowCount: number,
    parent: ColumnTable | null = null,
    parentRows: readonly number[] | Uint32Array | null = null,
  ) {
    this.#columns = columns;
    this.#rowCount = rowCount;
    this.#parent = parent;
    this.#parentRows = parentRows;
  }

  /** Build from row objects (missing keys become null). */
  static fromRows(rows: Rows): ColumnTable {
    const names = new Set<string>();
    for (const row of rows) for (const key of Object.keys(row)) names.add(key);
    const columns: Record<string, CellValue[]> = {};
    for (const name of names) {
      const column = Array.from<CellValue>({ length: rows.length });
      for (let index = 0; index < rows.length; index++) {
        const value = rows[index]![name];
        column[index] = value === undefined ? null : value;
      }
      columns[name] = column;
    }
    return new ColumnTable(columns, rows.length);
  }

  /** Build from column arrays (all columns must have equal length). */
  static fromColumns(columns: Columns): ColumnTable {
    const names = Object.keys(columns);
    const rowCount = names.length === 0 ? 0 : columns[names[0]!]!.length;
    for (const name of names) {
      if (columns[name]!.length !== rowCount) {
        throw new Error(
          `ColumnTable: column "${name}" has length ${columns[name]!.length}, expected ${rowCount}`,
        );
      }
    }
    return new ColumnTable({ ...columns }, rowCount);
  }

  get rowCount(): number {
    return this.#rowCount;
  }

  get fields(): string[] {
    return Object.keys(this.#columns);
  }

  has(name: string): boolean {
    return name in this.#columns;
  }

  columns(): Columns {
    return this.#columns;
  }

  column(name: string): readonly CellValue[] {
    const column = this.#columns[name];
    if (column === undefined) {
      throw new Error(
        `ColumnTable: unknown field "${name}" (available: ${this.fields.join(", ") || "none"})`,
      );
    }
    return column;
  }

  /** Immutable semantic view, cached by parser and conversion options. */
  parsed(
    name: string,
    parser: TemporalParserSpec | "auto" = "auto",
    options: ParsedColumnOptions = {},
  ): ParsedColumnView {
    const cacheKey = `${name}|${requestKey(parser, options)}`;
    const cached = this.#parsedCache.get(cacheKey);
    if (cached !== undefined) return cached;

    if (this.#parent !== null && this.#parentRows !== null) {
      const parent = this.#parent.parsed(name, parser, options);
      const semantic = new Float64Array(this.#parentRows.length);
      const valid = new Uint8Array(this.#parentRows.length);
      for (let index = 0; index < this.#parentRows.length; index++) {
        const sourceIndex = this.#parentRows[index]!;
        semantic[index] = parent.semantic[sourceIndex]!;
        valid[index] = parent.valid[sourceIndex]!;
      }
      const view: ParsedColumnView = {
        raw: this.column(name),
        semantic,
        valid,
        parserKey: parent.parserKey,
        ...(parent.temporalKind !== undefined && { temporalKind: parent.temporalKind }),
        ...(parent.temporalPrecision !== undefined && {
          temporalPrecision: parent.temporalPrecision,
        }),
        decision: parent.decision,
      };
      this.#parsedCache.set(cacheKey, view);
      return view;
    }

    const raw = this.column(name);
    const runtime = getTemporalRuntime();
    const parsed =
      runtime === null
        ? liteParseColumn(raw, parser, options)
        : runtime.parseColumn(raw, parser, options);
    const inferTemporal = options.inferTemporal !== false;
    const temporal = parser !== "auto" || (inferTemporal && parsed.decision.status === "temporal");
    // Lean liteParseColumn already materializes semantic/valid for every
    // decision (including nominal). Re-running fallbackNumeric doubled the
    // per-cell coerce cost on every non-temporal column (line-3×10k bind
    // was ~half of runPipeline). Full temporal runtime still falls back for
    // nominal auto columns so mixed/non-ISO cells get cellsToNumeric.
    const values =
      temporal || runtime === null
        ? { semantic: parsed.semantic, valid: parsed.valid }
        : fallbackNumeric(raw, inferTemporal);
    const view: ParsedColumnView = {
      raw,
      semantic: values.semantic,
      valid: values.valid,
      parserKey: `${parsed.decision.parserKey}|${optionsKey(options)}`,
      ...(parsed.decision.kind !== null &&
        parsed.decision.kind !== undefined && { temporalKind: parsed.decision.kind }),
      ...(parsed.decision.precision !== null &&
        parsed.decision.precision !== undefined && {
          temporalPrecision: parsed.decision.precision,
        }),
      decision: parsed.decision,
    };
    this.#parsedCache.set(cacheKey, view);
    return view;
  }

  /** Cached numeric view; explicit parser semantics are optional. */
  numeric(
    name: string,
    parser: TemporalParserSpec | "auto" = "auto",
    options: ParsedColumnOptions = {},
  ): Float64Array {
    return this.parsed(name, parser, options).semantic;
  }

  /**
   * Immutable transformed (scale-space) view, cached by the parsed request key
   * plus (transform, source limits, OOB, naValue). Identity with no OOB/NA
   * aliases the semantic arrays (no O(rows) copy). Subsets gather the parent's
   * transformed values by source row, so the transform runs once per source key
   * regardless of facet count.
   */
  transformed(
    name: string,
    parser: TemporalParserSpec | "auto",
    options: ParsedColumnOptions,
    config: ColumnTransformConfig,
  ): TransformedColumnView {
    const transformKey = transformConfigKey(config);
    const cacheKey = `${name}|${requestKey(parser, options)}|${transformKey}`;
    const cached = this.#transformedCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const parsedView = this.parsed(name, parser, options);

    // Fast path: identity with no OOB/NA rewrite aliases the semantic arrays.
    if (
      config.transform.key === "identity" &&
      config.sourceLimits === null &&
      config.naValue === null
    ) {
      const view: TransformedColumnView = {
        raw: parsedView.raw,
        semantic: parsedView.semantic,
        transformed: parsedView.semantic,
        valid: parsedView.valid,
        events: new Uint8Array(parsedView.valid.length),
        parserKey: parsedView.parserKey,
        transformKey,
        censored: 0,
        squished: 0,
        invalidTransform: 0,
      };
      this.#transformedCache.set(cacheKey, view);
      return view;
    }

    if (this.#parent !== null && this.#parentRows !== null) {
      const parent = this.#parent.transformed(name, parser, options, config);
      const length = this.#parentRows.length;
      const transformed = new Float64Array(length);
      const valid = new Uint8Array(length);
      const events = new Uint8Array(length);
      let censored = 0;
      let squished = 0;
      let invalidTransform = 0;
      for (let index = 0; index < length; index++) {
        const sourceIndex = this.#parentRows[index]!;
        transformed[index] = parent.transformed[sourceIndex]!;
        valid[index] = parent.valid[sourceIndex]!;
        const event = parent.events[sourceIndex]!;
        events[index] = event;
        if ((event & COLUMN_TRANSFORM_EVENT.censored) !== 0) censored++;
        if ((event & COLUMN_TRANSFORM_EVENT.squished) !== 0) squished++;
        if ((event & COLUMN_TRANSFORM_EVENT.invalidTransform) !== 0) invalidTransform++;
      }
      const view: TransformedColumnView = {
        raw: parsedView.raw,
        semantic: parsedView.semantic,
        transformed,
        valid,
        events,
        parserKey: parsedView.parserKey,
        transformKey,
        censored,
        squished,
        invalidTransform,
      };
      this.#transformedCache.set(cacheKey, view);
      return view;
    }

    const result = executeColumnTransform(parsedView.semantic, parsedView.valid, config);
    const view: TransformedColumnView = {
      raw: parsedView.raw,
      semantic: parsedView.semantic,
      transformed: result.transformed,
      valid: result.valid,
      events: result.events,
      parserKey: parsedView.parserKey,
      transformKey,
      censored: result.censored,
      squished: result.squished,
      invalidTransform: result.invalidTransform,
    };
    this.#transformedCache.set(cacheKey, view);
    return view;
  }

  /**
   * Row subset (facet/filter partition). Parsed views gather from this table,
   * preserving source decisions and avoiding per-panel parsing.
   */
  subset(rows: readonly number[] | Uint32Array): ColumnTable {
    const columns: Record<string, CellValue[]> = {};
    for (const name of this.fields) {
      const source = this.#columns[name]!;
      const column = Array.from<CellValue>({ length: rows.length });
      for (let index = 0; index < rows.length; index++) column[index] = source[rows[index]!]!;
      columns[name] = column;
    }
    return new ColumnTable(columns, rows.length, this, rows);
  }

  /** Inferred or explicitly parsed field type. */
  fieldType(
    name: string,
    parser: TemporalParserSpec | "auto" = "auto",
    options: ParsedColumnOptions = {},
  ): FieldType {
    if (parser !== "auto") return "temporal";
    const cacheKey = `${name}|${requestKey(parser, options)}`;
    const cached = this.#typeCache.get(cacheKey);
    if (cached !== undefined) return cached;
    if (this.#parent !== null) {
      const inherited = this.#parent.fieldType(name, parser, options);
      this.#typeCache.set(cacheKey, inherited);
      return inherited;
    }
    const view = this.parsed(name, parser, options);
    const type =
      options.inferTemporal === false
        ? this.column(name).every(
            (value, index) => value === null || Number.isFinite(view.semantic[index]!),
          )
          ? "quantitative"
          : "nominal"
        : view.decision.status === "temporal"
          ? "temporal"
          : // Monomorphic lean keys (lite:numbers / lite:labels) skip the
            // second O(n) typeof walk; mixed/Date fall through to
            // nonTemporalFieldType so lean and full agree (#1477 review).
            (fieldTypeFromLiteDecision(view.decision) ?? nonTemporalFieldType(this.column(name)));
    this.#typeCache.set(cacheKey, type);
    return type;
  }

  discreteness(
    name: string,
    parser: TemporalParserSpec | "auto" = "auto",
    options: ParsedColumnOptions = {},
  ): Discreteness {
    return discretenessOf(this.fieldType(name, parser, options));
  }
}
