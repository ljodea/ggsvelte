/**
 * ColumnTable — the pipeline's columnar data container (plan: "Columnar,
 * copy-conscious pipeline", Hadley lesson 10).
 *
 * - Accepts rows OR column arrays; stores columns.
 * - `numeric()` returns a cached Float64Array (data-space math is f64).
 * - Field type inference (documented, deterministic):
 *     string  -> nominal (discrete), UNLESS every non-null value is an ISO
 *                8601 date string -> temporal (continuous)
 *     boolean -> nominal (discrete)
 *     number  -> quantitative (continuous)
 *     Date    -> temporal (continuous — matches R's Date, decision 0005)
 *     null    -> carries no type information; ignored by inference
 *     mixed   -> nominal if ANY non-null value is a string/boolean (grouping
 *                spike rule), else quantitative
 *     empty / all-null -> quantitative (no evidence of discreteness)
 * - Discreteness follows the type: nominal -> discrete; quantitative and
 *   temporal -> continuous (decision 0005's `is.discrete` mirror).
 *
 * M0c note: temporal fields ride the LINEAR scale over epoch milliseconds
 * (the time scale lands in M1); `numeric()` converts Dates and ISO strings
 * to epoch ms.
 */

export type CellValue = string | number | boolean | Date | null;
export type Columns = Readonly<Record<string, readonly CellValue[]>>;
export type Rows = readonly Readonly<Record<string, CellValue>>[];

export type FieldType = "quantitative" | "temporal" | "nominal";
export type Discreteness = "discrete" | "continuous";

/** Full ISO 8601 date / date-time strings (what "dates travel as"). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function isISODateString(value: string): boolean {
  return ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

/** Deterministic field type inference (rules in the module docs). */
export function inferFieldType(column: readonly CellValue[]): FieldType {
  let sawNumber = false;
  let sawDate = false;
  let sawString = false;
  let allStringsISO = true;
  for (const v of column) {
    if (v === null) continue;
    switch (typeof v) {
      case "string":
        sawString = true;
        if (allStringsISO && !isISODateString(v)) allStringsISO = false;
        break;
      case "boolean":
        return "nominal";
      case "number":
        sawNumber = true;
        break;
      default:
        if (v instanceof Date) sawDate = true;
        break;
    }
  }
  if (sawString) {
    // strings win (mixed columns are nominal) unless ALL are ISO dates and
    // nothing contradicts a temporal reading
    return allStringsISO && !sawNumber ? "temporal" : "nominal";
  }
  if (sawDate) return "temporal";
  return "quantitative";
}

export function discretenessOf(type: FieldType): Discreteness {
  return type === "nominal" ? "discrete" : "continuous";
}

/** One cell's numeric reading (numbers pass; Dates/ISO strings -> epoch ms). */
export function cellToNumber(v: CellValue): number {
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") {
    if (isISODateString(v)) return Date.parse(v);
    const n = Number(v);
    return v.trim() === "" ? NaN : n;
  }
  return NaN; // null and anything else
}

/** Numeric view of a plain column (post-stat data outside a ColumnTable). */
export function cellsToNumeric(column: readonly CellValue[]): Float64Array {
  const out = new Float64Array(column.length);
  for (let i = 0; i < column.length; i++) out[i] = cellToNumber(column[i]!);
  return out;
}

export class ColumnTable {
  readonly #columns: Record<string, readonly CellValue[]>;
  readonly #rowCount: number;
  readonly #numericCache = new Map<string, Float64Array>();
  readonly #typeCache = new Map<string, FieldType>();

  private constructor(columns: Record<string, readonly CellValue[]>, rowCount: number) {
    this.#columns = columns;
    this.#rowCount = rowCount;
  }

  /** Build from row objects (missing keys become null). */
  static fromRows(rows: Rows): ColumnTable {
    const names = new Set<string>();
    for (const row of rows) for (const key of Object.keys(row)) names.add(key);
    const columns: Record<string, CellValue[]> = {};
    for (const name of names) {
      const column = Array.from<CellValue>({ length: rows.length });
      for (let i = 0; i < rows.length; i++) {
        const v = rows[i]![name];
        column[i] = v === undefined ? null : v;
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

  /** All columns (read-only view; used by group derivation). */
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

  /**
   * Cached Float64Array view of a column: numbers pass through, Dates and
   * ISO date strings become epoch ms, booleans 0/1, everything else NaN.
   */
  numeric(name: string): Float64Array {
    const cached = this.#numericCache.get(name);
    if (cached !== undefined) return cached;
    const column = this.column(name);
    const out = new Float64Array(column.length);
    for (let i = 0; i < column.length; i++) out[i] = cellToNumber(column[i]!);
    this.#numericCache.set(name, out);
    return out;
  }

  /**
   * Row subset (facet partition). Field TYPES are inherited from this table,
   * not re-inferred: a panel whose slice is all-null (or accidentally
   * numeric-looking) must scale exactly like its siblings.
   */
  subset(rows: readonly number[] | Uint32Array): ColumnTable {
    const columns: Record<string, CellValue[]> = {};
    for (const name of this.fields) {
      const source = this.#columns[name]!;
      const column = Array.from<CellValue>({ length: rows.length });
      for (let i = 0; i < rows.length; i++) column[i] = source[rows[i]!]!;
      columns[name] = column;
    }
    const out = new ColumnTable(columns, rows.length);
    for (const name of this.fields) out.#typeCache.set(name, this.fieldType(name));
    return out;
  }

  /** Inferred field type (cached; rules in module docs). */
  fieldType(name: string): FieldType {
    const cached = this.#typeCache.get(name);
    if (cached !== undefined) return cached;
    const type = inferFieldType(this.column(name));
    this.#typeCache.set(name, type);
    return type;
  }

  discreteness(name: string): Discreteness {
    return discretenessOf(this.fieldType(name));
  }
}
