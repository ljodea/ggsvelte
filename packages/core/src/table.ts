/**
 * ColumnTable — the pipeline's columnar data container.
 *
 * Temporal meaning is owned by @ggsvelte/spec's strict parser registry. A
 * ColumnTable caches immutable parsed views by field + parser semantics;
 * subsets gather parent views so filters/facets never reclassify or reparse.
 */
import {
  canonicalTemporalParserKey,
  inferTemporalColumn,
  parseTemporal,
  parseTemporalColumn,
  type TemporalDecision,
  type TemporalDisambiguation,
  type TemporalKind,
  type TemporalParserSpec,
  type TemporalPrecision,
} from "@ggsvelte/spec";

export type CellValue = string | number | boolean | Date | null;
export type Columns = Readonly<Record<string, readonly CellValue[]>>;
export type Rows = readonly Readonly<Record<string, CellValue>>[];

export type FieldType = "quantitative" | "temporal" | "nominal";
export type Discreteness = "discrete" | "continuous";
type TemporalFailurePolicy = "error" | "censor";

export interface ParsedColumnOptions {
  timezone?: string;
  disambiguation?: TemporalDisambiguation;
  failurePolicy?: TemporalFailurePolicy;
}

export interface ParsedColumnView {
  raw: readonly CellValue[];
  semantic: Float64Array;
  valid: Uint8Array;
  parserKey: string;
  temporalKind?: TemporalKind;
  temporalPrecision?: TemporalPrecision;
  decision: TemporalDecision;
}

/** Strict ISO predicate retained for public import compatibility. */
export function isISODateString(value: string): boolean {
  return parseTemporal(value, "iso").ok;
}

function nonTemporalFieldType(column: readonly CellValue[]): FieldType {
  let sawNumber = false;
  let sawDate = false;
  let sawString = false;
  for (const value of column) {
    if (value === null) continue;
    switch (typeof value) {
      case "string":
        sawString = true;
        break;
      case "boolean":
        return "nominal";
      case "number":
        sawNumber = true;
        break;
      default:
        if (value instanceof Date && Number.isFinite(value.getTime())) sawDate = true;
        else return "nominal";
    }
  }
  if (sawString || (sawDate && sawNumber)) return "nominal";
  if (sawDate) return "temporal";
  return "quantitative";
}

/** Deterministic field type inference using the shared temporal registry. */
export function inferFieldType(column: readonly CellValue[]): FieldType {
  const temporal = inferTemporalColumn(column);
  return temporal.status === "temporal" ? "temporal" : nonTemporalFieldType(column);
}

export function discretenessOf(type: FieldType): Discreteness {
  return type === "nominal" ? "discrete" : "continuous";
}

/** One context-free numeric reading. Column temporal conversion uses parsed(). */
export function cellToNumber(value: CellValue): number {
  if (typeof value === "number") return value;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const iso = parseTemporal(value, "iso");
    if (iso.ok) return iso.epochMs;
    const numeric = Number(value);
    return value.trim() === "" ? Number.NaN : numeric;
  }
  return Number.NaN;
}

/** Numeric view of a plain column (post-stat data outside a ColumnTable). */
export function cellsToNumeric(column: readonly CellValue[]): Float64Array {
  const out = new Float64Array(column.length);
  for (let index = 0; index < column.length; index++) out[index] = cellToNumber(column[index]!);
  return out;
}

function optionsKey(options: ParsedColumnOptions): string {
  return [
    options.timezone ?? "UTC",
    options.disambiguation ?? "reject",
    options.failurePolicy ?? "error",
  ].join("|");
}

function parseOptions(options: ParsedColumnOptions) {
  return {
    ...(options.timezone !== undefined && { timezone: options.timezone }),
    ...(options.disambiguation !== undefined && { disambiguation: options.disambiguation }),
  };
}

function requestKey(parser: TemporalParserSpec | "auto", options: ParsedColumnOptions): string {
  return `${parser === "auto" ? "auto" : canonicalTemporalParserKey(parser)}|${optionsKey(options)}`;
}

function fallbackNumeric(raw: readonly CellValue[]): { semantic: Float64Array; valid: Uint8Array } {
  const semantic = cellsToNumeric(raw);
  const valid = new Uint8Array(raw.length);
  for (let index = 0; index < semantic.length; index++) {
    if (Number.isFinite(semantic[index]!)) valid[index] = 1;
  }
  return { semantic, valid };
}

export class ColumnTable {
  readonly #columns: Record<string, readonly CellValue[]>;
  readonly #rowCount: number;
  readonly #parsedCache = new Map<string, ParsedColumnView>();
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
    const parsed = parseTemporalColumn(raw, parser, parseOptions(options));
    const temporal = parser !== "auto" || parsed.decision.status === "temporal";
    const values = temporal
      ? { semantic: parsed.semantic, valid: parsed.valid }
      : fallbackNumeric(raw);
    const view: ParsedColumnView = {
      raw,
      semantic: values.semantic,
      valid: values.valid,
      parserKey: `${parsed.decision.parserKey}|${optionsKey(options)}`,
      ...(parsed.decision.kind !== null && { temporalKind: parsed.decision.kind }),
      ...(parsed.decision.precision !== null && {
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
    const decision = this.parsed(name, parser, options).decision;
    const type =
      decision.status === "temporal" ? "temporal" : nonTemporalFieldType(this.column(name));
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
