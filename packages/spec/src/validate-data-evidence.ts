/**
 * Field-evidence construction for tier-2 validation and lint.
 *
 * Builds a FieldEvidenceMap once per validate()/lintSpec() call from either a
 * DataProfile or inline data (pivot + type inference), under input limits.
 * Shared so large inline data is not scanned twice when both dataChecks and
 * lintSpec run.
 */
import type { SpecError } from "./errors.js";
import type { Aes, CellValue, ChannelName } from "./schema.js";
import { inferTemporalColumn, type TemporalDecision } from "./temporal-column.js";
import type { ProfileFieldType, ValidateLimits, ValidateOptions } from "./validate-data.js";

// ---------------------------------------------------------------------------
// Field evidence types
// ---------------------------------------------------------------------------

/**
 * One field's type evidence for tier-2 checks and lint. Built once per
 * validate() when both dataChecks and lintSpec run, so large inline data is
 * not pivoted/type-scanned twice.
 */
export interface FieldEvidenceEntry {
  type: ProfileFieldType | null;
  /** True when the column exists but has only null values (inline data only). */
  allNull: boolean;
  /** Raw column values (inline data only; null for profile-backed fields). */
  values: readonly CellValue[] | null;
  /** Shared value-driven temporal decision (inline data only). */
  temporal: TemporalDecision | null;
}

export type FieldEvidenceMap = Map<string, FieldEvidenceEntry>;

/** Result of resolving profile/inline data into a field evidence map. */
export type ResolveFieldEvidenceResult =
  | { status: "ok"; fields: FieldEvidenceMap }
  | { status: "none" }
  | { status: "errors"; errors: SpecError[] };

// ---------------------------------------------------------------------------
// Channel helper (shared by structure checks, data checks, and lint)
// ---------------------------------------------------------------------------

/** The channel a layer effectively sees (layer wins; null unsets). */
export function effectiveChannel(
  plotAes: Aes | undefined,
  layerAes: Aes | undefined,
  channel: ChannelName,
): Exclude<Aes[ChannelName], null | undefined> | undefined {
  const own = layerAes?.[channel];
  if (own === null) return undefined;
  const chosen = own ?? plotAes?.[channel];
  return chosen ?? undefined;
}

// ---------------------------------------------------------------------------
// Type inference + profile / inline resolution
// ---------------------------------------------------------------------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const PROFILE_TYPES: ReadonlySet<string> = new Set([
  "quantitative",
  "temporal",
  "ordinal",
  "nominal",
]);

function inferProfileType(column: readonly CellValue[]): {
  type: ProfileFieldType | null;
  temporal: TemporalDecision;
} {
  const temporal = inferTemporalColumn(column);
  if (temporal.status === "temporal") return { type: "temporal", temporal };
  let sawNumber = false;
  let sawValue = false;
  for (const value of column) {
    if (value === null) continue;
    sawValue = true;
    if (typeof value === "boolean" || typeof value === "string") {
      return { type: "nominal", temporal };
    }
    if (typeof value === "number") sawNumber = true;
  }
  return { type: sawNumber ? "quantitative" : sawValue ? "nominal" : null, temporal };
}

function badProfile(message: string): SpecError[] {
  return [
    {
      code: "invalid-data-profile",
      path: "",
      message: `Invalid DataProfile: ${message}`,
      fix: {
        description:
          'Provide { fields: [{ name, type: "quantitative"|"temporal"|"ordinal"|"nominal" }], rowCount? }.',
        example: { fields: [{ name: "displ", type: "quantitative" }], rowCount: 234 },
      },
    },
  ];
}

function profileErrors(profile: unknown): SpecError[] {
  if (!isRecord(profile)) return badProfile("expected an object.");
  if (!Array.isArray(profile["fields"])) return badProfile('"fields" must be an array.');
  for (const field of profile["fields"] as unknown[]) {
    if (!isRecord(field) || typeof field["name"] !== "string") {
      return badProfile('every field needs a string "name".');
    }
    if (typeof field["type"] !== "string" || !PROFILE_TYPES.has(field["type"])) {
      return badProfile(
        `field "${field["name"]}" has type ${JSON.stringify(field["type"])}; allowed: quantitative, temporal, ordinal, nominal.`,
      );
    }
  }
  if (profile["rowCount"] !== undefined && typeof profile["rowCount"] !== "number") {
    return badProfile('"rowCount" must be a number when present.');
  }
  return [];
}

/**
 * Resolve inline columns from a data ref against optional named datasets.
 * Named refs that are not present in datasets return null (runtime-only data).
 */
function columnsFromDataRef(
  data: unknown,
  datasets: unknown,
): Record<string, readonly CellValue[]> | null {
  let ref = data;
  if (isRecord(ref) && typeof ref["name"] === "string") {
    ref = isRecord(datasets) ? datasets[ref["name"]] : undefined;
  }
  if (!isRecord(ref)) return null;
  if (Array.isArray(ref["values"])) {
    const rows = ref["values"] as Record<string, CellValue>[];
    const columns: Record<string, CellValue[]> = {};
    for (const row of rows) {
      if (!isRecord(row)) continue;
      for (const key of Object.keys(row)) columns[key] ??= [];
    }
    for (const key of Object.keys(columns)) {
      const column = columns[key]!;
      for (const row of rows) column.push(isRecord(row) ? (row[key] ?? null) : null);
    }
    return columns;
  }
  if (isRecord(ref["columns"])) {
    return ref["columns"] as Record<string, readonly CellValue[]>;
  }
  return null;
}

/** Resolve the spec's plot-level inline columns ({values}, {columns}, or named). */
function inlineColumns(spec: Record<string, unknown>): Record<string, readonly CellValue[]> | null {
  return columnsFromDataRef(spec["data"], spec["datasets"]);
}

function evidenceFromColumns(columns: Record<string, readonly CellValue[]>): FieldEvidenceMap {
  const fields: FieldEvidenceMap = new Map();
  for (const name of Object.keys(columns)) {
    const column = columns[name]!;
    const inferred = inferProfileType(column);
    fields.set(name, {
      type: inferred.type,
      allNull: column.length > 0 && inferred.type === null,
      values: column,
      temporal: inferred.temporal,
    });
  }
  return fields;
}

/**
 * Per-layer field evidence (#589). Each layer inherits plot-level evidence
 * unless it supplies its own inline/named-inline data.
 * Layers with only unresolved named (runtime) data get `null` (skip type checks).
 */
export function resolveLayerFieldEvidence(
  spec: Record<string, unknown>,
  options: ValidateOptions,
  limits: ValidateLimits,
):
  | { status: "ok"; plot: FieldEvidenceMap | null; layers: Array<FieldEvidenceMap | null> }
  | { status: "none" }
  | { status: "errors"; errors: SpecError[] } {
  if (options.profile !== undefined) {
    const bad = profileErrors(options.profile);
    if (bad.length > 0) return { status: "errors", errors: bad };
    const fields: FieldEvidenceMap = new Map();
    for (const f of options.profile.fields) {
      fields.set(f.name, { type: f.type, allNull: false, values: null, temporal: null });
    }
    const layers = Array.isArray(spec["layers"]) ? (spec["layers"] as unknown[]) : [];
    return { status: "ok", plot: fields, layers: layers.map(() => fields) };
  }

  const datasets = spec["datasets"];
  const plotColumns = inlineColumns(spec);
  let totalRows = 0;
  let totalBytes = 0;
  if (plotColumns !== null) {
    const names = Object.keys(plotColumns);
    const rowCount = names.length === 0 ? 0 : (plotColumns[names[0]!]?.length ?? 0);
    totalRows += rowCount;
    totalBytes += estimateBytes(plotColumns, rowCount);
  }

  const layers = Array.isArray(spec["layers"]) ? (spec["layers"] as unknown[]) : [];
  const layerColumns: Array<Record<string, readonly CellValue[]> | null | "runtime"> = [];
  for (const layer of layers) {
    if (!isRecord(layer) || layer["data"] === undefined) {
      layerColumns.push(null); // inherit plot
      continue;
    }
    const cols = columnsFromDataRef(layer["data"], datasets);
    if (cols === null) {
      // Named ref not in datasets (or malformed) — runtime-only / skip.
      layerColumns.push("runtime");
      continue;
    }
    const names = Object.keys(cols);
    const rowCount = names.length === 0 ? 0 : (cols[names[0]!]?.length ?? 0);
    totalRows += rowCount;
    totalBytes += estimateBytes(cols, rowCount);
    layerColumns.push(cols);
  }

  if (plotColumns === null && layerColumns.every((c) => c === null || c === "runtime")) {
    return { status: "none" };
  }

  if (totalRows > limits.maxRows) {
    return {
      status: "errors",
      errors: [
        {
          code: "validation-limit",
          path: "/data",
          message: `Inline data has ${totalRows} rows across plot/layers, more than the documented maxRows limit (${limits.maxRows}); data-aware checks skipped. Validate with a DataProfile instead.`,
        },
      ],
    };
  }
  if (totalBytes > limits.maxBytes) {
    return {
      status: "errors",
      errors: [
        {
          code: "validation-limit",
          path: "/data",
          message: `Inline data exceeds the documented maxBytes limit (${limits.maxBytes} bytes, estimated across plot/layers); data-aware checks skipped. Validate with a DataProfile instead.`,
        },
      ],
    };
  }

  const plot = plotColumns === null ? null : evidenceFromColumns(plotColumns);
  const layerMaps: Array<FieldEvidenceMap | null> = layerColumns.map((cols) => {
    if (cols === "runtime") return null;
    if (cols === null) return plot;
    return evidenceFromColumns(cols);
  });
  return { status: "ok", plot, layers: layerMaps };
}

function estimateBytes(columns: Record<string, readonly CellValue[]>, rowCount: number): number {
  // Estimate from a bounded sample so the limit check itself stays cheap.
  const sample = Math.min(rowCount, 100);
  if (sample === 0) return 0;
  let sampleBytes = 0;
  for (const column of Object.values(columns)) {
    sampleBytes += JSON.stringify(column.slice(0, sample))?.length ?? 0;
  }
  return Math.round((sampleBytes / sample) * rowCount);
}

/**
 * Resolve profile or inline data into a field evidence map (one pivot + type
 * inference pass). Shared by dataChecks and lintSpec via validate().
 */
export function resolveFieldEvidence(
  spec: Record<string, unknown>,
  options: ValidateOptions,
  limits: ValidateLimits,
): ResolveFieldEvidenceResult {
  if (options.profile !== undefined) {
    const bad = profileErrors(options.profile);
    if (bad.length > 0) return { status: "errors", errors: bad };
    const fields: FieldEvidenceMap = new Map();
    for (const f of options.profile.fields) {
      fields.set(f.name, { type: f.type, allNull: false, values: null, temporal: null });
    }
    return { status: "ok", fields };
  }

  const columns = inlineColumns(spec);
  if (columns === null) return { status: "none" };

  const names = Object.keys(columns);
  const rowCount = names.length === 0 ? 0 : (columns[names[0]!]?.length ?? 0);
  if (rowCount > limits.maxRows) {
    return {
      status: "errors",
      errors: [
        {
          code: "validation-limit",
          path: "/data",
          message: `Inline data has ${rowCount} rows, more than the documented maxRows limit (${limits.maxRows}); data-aware checks skipped. Validate with a DataProfile instead.`,
        },
      ],
    };
  }
  if (estimateBytes(columns, rowCount) > limits.maxBytes) {
    return {
      status: "errors",
      errors: [
        {
          code: "validation-limit",
          path: "/data",
          message: `Inline data exceeds the documented maxBytes limit (${limits.maxBytes} bytes, estimated); data-aware checks skipped. Validate with a DataProfile instead.`,
        },
      ],
    };
  }

  const fields: FieldEvidenceMap = new Map();
  for (const name of names) {
    const column = columns[name]!;
    const inferred = inferProfileType(column);
    fields.set(name, {
      type: inferred.type,
      allNull: column.length > 0 && inferred.type === null,
      values: column,
      temporal: inferred.temporal,
    });
  }
  return { status: "ok", fields };
}
