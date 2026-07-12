/**
 * Tier-2 validation — data-aware checks (plan: "Tier-2 accepts inline data OR
 * a defined DataProfile"). Runs when validate() receives an options argument.
 *
 * Checks:
 *  - field existence: every { field } channel must name an available field
 *    (with a did-you-mean suggestion against the available names);
 *  - all-null columns (inline data only) are tier-2 errors;
 *  - { stat } channels must name a column the layer's stat generates
 *    (identity generates none; count generates "count");
 *  - scale/type compatibility: scales.*.type "time" needs temporal fields,
 *    "log"/"linear" refuse nominal/ordinal fields, color/fill "sequential"
 *    needs quantitative fields.
 *
 * Input limits (DEFAULT_VALIDATE_LIMITS — documented, overridable): agent-
 * facing validation must not be resource-abusable. Over-limit inputs get a
 * `validation-limit` diagnostic and the data-aware checks are skipped;
 * diagnostics themselves are capped by maxDiagnostics (enforced in validate()).
 */
import type { JSONValue } from "./portability.js";
import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import type { Aes, CellValue, ChannelName, ColorScaleSpec, PositionScaleSpec } from "./schema.js";
import { CHANNELS, GEOM_DEFAULTS } from "./schema.js";

// ---------------------------------------------------------------------------
// Public contract
// ---------------------------------------------------------------------------

/** Field type vocabulary shared with agents (Vega-Lite-compatible names). */
export type ProfileFieldType = "quantitative" | "temporal" | "ordinal" | "nominal";

export interface DataProfileField {
  name: string;
  type: ProfileFieldType;
  /** Optional example values (used in error messages, never validated). */
  examples?: JSONValue[];
}

/** A description of out-of-band data, for validating specs without the data. */
export interface DataProfile {
  fields: DataProfileField[];
  rowCount?: number;
}

/** Documented input limits for validate(). */
export interface ValidateLimits {
  /** Max inline-data rows examined (default 100_000). */
  maxRows: number;
  /** Max estimated inline-data bytes examined (default 20 MB). */
  maxBytes: number;
  /** Max JSON nesting depth of the spec (default 32). */
  maxDepth: number;
  /** Max diagnostics returned per run (default 100). */
  maxDiagnostics: number;
}

export const DEFAULT_VALIDATE_LIMITS: ValidateLimits = {
  maxRows: 100_000,
  maxBytes: 20 * 1024 * 1024,
  maxDepth: 32,
  maxDiagnostics: 100,
};

export interface ValidateOptions {
  /** Describe out-of-band data instead of inlining it. Wins over inline data. */
  profile?: DataProfile;
  /** Override the documented input limits. */
  limits?: Partial<ValidateLimits>;
  /** Also run lintSpec() and attach its advisories to the result (lint.ts). */
  lint?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Depth of a JSON-ish value, short-circuiting at `cap + 1`. */
export function jsonDepth(value: unknown, cap: number): number {
  if (typeof value !== "object" || value === null) return 0;
  let max = 0;
  const entries = Array.isArray(value) ? value : Object.values(value);
  for (const child of entries) {
    const d = jsonDepth(child, cap - 1);
    if (d >= cap) return d + 1; // short-circuit: already too deep
    if (d > max) max = d;
  }
  return max + 1;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

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

const PROFILE_TYPES: ReadonlySet<string> = new Set([
  "quantitative",
  "temporal",
  "ordinal",
  "nominal",
]);

/** ISO 8601 date / date-time strings (mirrors @ggsvelte/core's inference). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

export function inferProfileType(column: readonly CellValue[]): ProfileFieldType | null {
  let sawNumber = false;
  let sawDate = false;
  let sawString = false;
  let allStringsISO = true;
  for (const v of column) {
    if (v === null) continue;
    switch (typeof v) {
      case "string":
        sawString = true;
        if (allStringsISO && !(ISO_DATE_RE.test(v) && !Number.isNaN(Date.parse(v)))) {
          allStringsISO = false;
        }
        break;
      case "boolean":
        return "nominal";
      case "number":
        sawNumber = true;
        break;
      default:
        sawDate = true;
        break;
    }
  }
  if (sawString) return allStringsISO && !sawNumber ? "temporal" : "nominal";
  if (sawDate) return "temporal";
  if (sawNumber) return "quantitative";
  return null; // empty / all-null: no type evidence
}

interface FieldInfo {
  type: ProfileFieldType | null;
  /** True when the column exists but has only null values (inline data only). */
  allNull: boolean;
}

interface FieldTable {
  fields: Map<string, FieldInfo>;
  /** "profile" or "inline" — for message wording. */
  source: "profile" | "inline";
}

/** Columns generated by each stat ({ stat } channel resolution contract).
 *  Documented per stat in its @ggsvelte/core module header. */
export const STAT_COLUMNS: Record<string, readonly string[]> = {
  identity: [],
  count: ["count"],
  bin: ["count", "density", "ncount", "ndensity"],
  density: ["density", "count", "scaled", "ndensity"],
  smooth: ["y", "ymin", "ymax", "se"],
  boxplot: ["ymin", "lower", "middle", "upper", "ymax"],
  summary: ["y", "ymin", "ymax"],
};

// ---------------------------------------------------------------------------
// Field table construction
// ---------------------------------------------------------------------------

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

function fieldsFromProfile(profile: DataProfile): FieldTable {
  const fields = new Map<string, FieldInfo>();
  for (const f of profile.fields) fields.set(f.name, { type: f.type, allNull: false });
  return { fields, source: "profile" };
}

/** Resolve the spec's inline columns ({values}, {columns}, or a named inline dataset). */
export function inlineColumns(
  spec: Record<string, unknown>,
): Record<string, readonly CellValue[]> | null {
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

// ---------------------------------------------------------------------------
// dataChecks — the tier-2 walk
// ---------------------------------------------------------------------------

const AXIS_CHANNELS = ["x", "y"] as const;
const COLOR_CHANNELS = ["color", "fill"] as const;

export function dataChecks(
  spec: Record<string, unknown>,
  options: ValidateOptions,
  limits: ValidateLimits,
): SpecError[] {
  const errors: SpecError[] = [];

  // --- build the field table -------------------------------------------------
  let table: FieldTable | null = null;
  if (options.profile === undefined) {
    const columns = inlineColumns(spec);
    if (columns !== null) {
      const names = Object.keys(columns);
      const rowCount = names.length === 0 ? 0 : (columns[names[0]!]?.length ?? 0);
      if (rowCount > limits.maxRows) {
        return [
          {
            code: "validation-limit",
            path: "/data",
            message: `Inline data has ${rowCount} rows, more than the documented maxRows limit (${limits.maxRows}); data-aware checks skipped. Validate with a DataProfile instead.`,
          },
        ];
      }
      if (estimateBytes(columns, rowCount) > limits.maxBytes) {
        return [
          {
            code: "validation-limit",
            path: "/data",
            message: `Inline data exceeds the documented maxBytes limit (${limits.maxBytes} bytes, estimated); data-aware checks skipped. Validate with a DataProfile instead.`,
          },
        ];
      }
      const fields = new Map<string, FieldInfo>();
      for (const name of names) {
        const column = columns[name]!;
        const type = inferProfileType(column);
        fields.set(name, { type, allNull: column.length > 0 && type === null });
      }
      table = { fields, source: "inline" };
    }
  } else {
    const bad = profileErrors(options.profile);
    if (bad.length > 0) return bad;
    table = fieldsFromProfile(options.profile);
  }
  if (table === null) return errors; // no data, no profile: nothing to check

  const available = [...table.fields.keys()];
  const plotAes = isRecord(spec["aes"]) ? (spec["aes"] as Aes) : undefined;
  const layers = Array.isArray(spec["layers"]) ? (spec["layers"] as unknown[]) : [];

  interface AxisUse {
    field: string;
    path: string;
  }
  const axisFields: Record<"x" | "y", AxisUse[]> = { x: [], y: [] };
  const colorFields: Record<"color" | "fill", AxisUse[]> = { color: [], fill: [] };

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!isRecord(layer)) continue;
    const geom = typeof layer["geom"] === "string" ? layer["geom"] : "";
    const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
    const defaultStat = GEOM_DEFAULTS[geom as keyof typeof GEOM_DEFAULTS]?.stat ?? "identity";
    const stat = typeof layer["stat"] === "string" ? layer["stat"] : defaultStat;

    // --- geom/stat field-type rules (M2 statistical layer) -----------------
    const fieldTypeOf = (channel: ChannelName): [string, ProfileFieldType] | null => {
      const m = effectiveChannel(plotAes, layerAes, channel);
      if (m === undefined || !("field" in m)) return null;
      const t = table.fields.get(m.field)?.type;
      return t === undefined || t === null ? null : [m.field, t];
    };
    const typeError = (channel: ChannelName, message: string, fixDesc: string) => {
      errors.push({
        code: "channel-type-mismatch",
        path: `/layers/${i}/aes/${channel}`,
        message,
        fix: { description: fixDesc },
      });
    };
    if (geom === "smooth") {
      for (const channel of ["x", "y"] as const) {
        const info = fieldTypeOf(channel);
        if (info !== null && (info[1] === "nominal" || info[1] === "ordinal")) {
          typeError(
            channel,
            `The smooth stat needs quantitative x and y, but field "${info[0]}" (${channel}) is ${info[1]}.`,
            "Map the channel to a numeric field, or use a boxplot for discrete x.",
          );
        }
      }
    }
    if (geom === "boxplot") {
      const x = fieldTypeOf("x");
      if (x !== null && (x[1] === "quantitative" || x[1] === "temporal")) {
        typeError(
          "x",
          `The boxplot geom needs a DISCRETE x this milestone, but field "${x[0]}" is ${x[1]}.`,
          "Map x to a categorical field (strings), or bin the values into labeled categories first.",
        );
      }
      const y = fieldTypeOf("y");
      if (y !== null && (y[1] === "nominal" || y[1] === "ordinal")) {
        typeError(
          "y",
          `The boxplot stat needs a quantitative y, but field "${y[0]}" is ${y[1]}.`,
          "Map y to a numeric field.",
        );
      }
    }
    if (geom === "histogram" || geom === "density" || (geom === "bar" && stat === "bin")) {
      const x = fieldTypeOf("x");
      if (x !== null && (x[1] === "nominal" || x[1] === "ordinal")) {
        typeError(
          "x",
          `The ${geom === "density" ? "density" : "bin"} stat needs a continuous x, but field "${x[0]}" is ${x[1]}.`,
          'Use geom "bar" (the count stat) to count categories instead.',
        );
      }
    }
    if (geom === "errorbar") {
      for (const channel of ["ymin", "ymax"] as const) {
        const info = fieldTypeOf(channel);
        if (info !== null && (info[1] === "nominal" || info[1] === "ordinal")) {
          typeError(
            channel,
            `The errorbar geom needs quantitative bounds, but field "${info[0]}" (${channel}) is ${info[1]}.`,
            "Map the channel to a numeric field.",
          );
        }
      }
    }

    for (const channel of CHANNELS) {
      const mapped = effectiveChannel(plotAes, layerAes, channel);
      if (mapped === undefined) continue;
      const path = `/layers/${i}/aes/${channel}`;

      if ("stat" in mapped) {
        const generated = STAT_COLUMNS[stat] ?? [];
        if (!generated.includes(mapped.stat)) {
          errors.push({
            code: "unknown-stat-column",
            path,
            message:
              generated.length === 0
                ? `Channel "${channel}" maps stat column "${mapped.stat}", but this layer's stat ("${stat}") generates no columns.`
                : `Channel "${channel}" maps stat column "${mapped.stat}", but this layer's stat ("${stat}") generates: ${generated.join(", ")}.`,
            ...(generated.length > 0 && { allowed: [...generated] }),
          });
        }
        continue;
      }
      if (!("field" in mapped)) continue;

      const info = table.fields.get(mapped.field);
      if (info === undefined) {
        const suggestion = didYouMean(mapped.field, available);
        errors.push({
          code: "unknown-field",
          path,
          message:
            `Unknown field "${mapped.field}" (available: ${available.join(", ") || "none"}).` +
            (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
          allowed: available,
          ...(suggestion !== undefined && {
            fix: {
              description: `Map "${channel}" to "${suggestion}".`,
              example: { field: suggestion },
            },
          }),
        });
        continue;
      }
      if (info.allNull) {
        errors.push({
          code: "all-null-column",
          path,
          message: `Field "${mapped.field}" contains only null values; the "${channel}" channel cannot be drawn from it.`,
        });
        continue;
      }
      if (channel === "x" || channel === "y")
        axisFields[channel].push({ field: mapped.field, path });
      if (channel === "color" || channel === "fill") {
        colorFields[channel].push({ field: mapped.field, path });
      }
    }
  }

  // --- scale/type compatibility ----------------------------------------------
  const scales = isRecord(spec["scales"]) ? spec["scales"] : undefined;
  const typeOf = (field: string) => table.fields.get(field)?.type ?? null;

  for (const axis of AXIS_CHANNELS) {
    const config = scales?.[axis] as PositionScaleSpec | undefined;
    const declared = config?.type;
    if (declared === undefined || declared === "band") continue;
    for (const use of axisFields[axis]) {
      const type = typeOf(use.field);
      if (type === null) continue;
      if (declared === "time" && type !== "temporal") {
        errors.push({
          code: "scale-type-mismatch",
          path: use.path,
          message: `scales.${axis}.type is "time" but field "${use.field}" is ${type}; time scales need temporal values (Dates or ISO 8601 strings).`,
        });
      } else if (
        (declared === "log" || declared === "linear") &&
        (type === "nominal" || type === "ordinal")
      ) {
        errors.push({
          code: "scale-type-mismatch",
          path: use.path,
          message: `scales.${axis}.type is "${declared}" but field "${use.field}" is ${type}; use a band scale (or a quantitative field).`,
          fix: { description: `Set scales.${axis}.type to "band".` },
        });
      }
    }
  }

  for (const channel of COLOR_CHANNELS) {
    const config = scales?.[channel] as ColorScaleSpec | undefined;
    if (config?.type !== "sequential") continue;
    for (const use of colorFields[channel]) {
      const type = typeOf(use.field);
      if (type === "nominal" || type === "ordinal") {
        errors.push({
          code: "scale-type-mismatch",
          path: use.path,
          message: `scales.${channel}.type is "sequential" but field "${use.field}" is ${type}; sequential color ramps need quantitative values.`,
          fix: { description: `Set scales.${channel}.type to "ordinal".` },
        });
      }
    }
  }

  return errors;
}
