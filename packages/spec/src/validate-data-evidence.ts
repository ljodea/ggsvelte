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

/** Resolve the spec's inline columns ({values}, {columns}, or a named inline dataset). */
function inlineColumns(spec: Record<string, unknown>): Record<string, readonly CellValue[]> | null {
  let data = spec["data"];
  if (isRecord(data) && typeof data["name"] === "string") {
    const datasets = spec["datasets"];
    data = isRecord(datasets) ? datasets[data["name"]] : undefined;
  }
  if (!isRecord(data)) return null;
  if (Array.isArray(data["values"])) {
    const rows = data["values"] as Record<string, CellValue>[];
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
  if (isRecord(data["columns"])) {
    return data["columns"] as Record<string, readonly CellValue[]>;
  }
  return null;
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
