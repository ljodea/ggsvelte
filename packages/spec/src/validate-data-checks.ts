/**
 * Tier-2 data-aware walk — field existence, all-null columns, {stat} columns,
 * geom/stat type rules, then scale/type compatibility.
 *
 * Implementation:
 *  - validate-data-checks-temporal.ts — shared temporalDecisionForField memoization
 *  - validate-data-checks-position.ts — pre-evidence temporal axis config + x/y scale types
 *  - validate-data-checks-color.ts — color/fill scale types + manual domain/range
 *
 * Consumes a FieldEvidenceMap built by validate-data-evidence.ts (or builds one
 * when not pre-resolved).
 */
import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import type { Aes, ChannelName } from "./schema.js";
import { CHANNELS, GEOM_DEFAULTS } from "./schema.js";
import type { ProfileFieldType, ValidateLimits, ValidateOptions } from "./validate-data.js";
import { parseTemporalColumn, type TemporalDecision } from "./temporal-column.js";
import {
  effectiveChannel,
  resolveFieldEvidence,
  resolveLayerFieldEvidence,
  type FieldEvidenceMap,
  type ResolveFieldEvidenceResult,
} from "./validate-data-evidence.js";
import { checkColorScaleDataCompatibility } from "./validate-data-checks-color.js";
import {
  checkPositionScaleDataCompatibility,
  scaleRequestsTime,
  validateTemporalAxisConfiguration,
} from "./validate-data-checks-position.js";
import {
  temporalDecisionForField,
  temporalParserUsable,
  type ChannelFieldUse,
} from "./validate-data-checks-temporal.js";
import { parseTemporal } from "./temporal-parse.js";

/** True when a scaled constant is what the core `cellToNumber()` coerces to a
 *  finite number, mirroring the non-temporal numeric-style path
 *  (scale-style-values.ts). Booleans, numeric strings and ISO date strings all
 *  train and render at runtime, so validation must accept them too. Core's
 *  cellToNumber cannot be imported here (core depends on spec, not vice versa),
 *  so the predicate is replicated. */
function scaledConstantCoercesToFinite(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (value instanceof Date) return Number.isFinite(value.getTime());
  if (typeof value === "boolean") return true;
  if (typeof value === "string") {
    if (parseTemporal(value, "iso").ok) return true;
    return value.trim() !== "" && Number.isFinite(Number(value));
  }
  return false;
}

/** Format an arbitrary value for a diagnostic message without ever throwing.
 *  Tier-2 runs after schema errors, so a schema-invalid JS constant (BigInt,
 *  Symbol, circular object) can reach a message; JSON.stringify throws on BigInt
 *  and String() throws on Symbol, so fall back through both to the type name. */
function safeFormatConstant(value: unknown): string {
  try {
    const json = JSON.stringify(value);
    if (json !== undefined) return json;
  } catch {
    /* BigInt / circular — fall through */
  }
  try {
    return String(value);
  } catch {
    return typeof value;
  }
}

/** A quantitative field carrying temporal options resolves at runtime only when a
 *  working parser (or censor recovery) yields temporal values. Returns a mismatch
 *  error or null. Extracted to keep the field loop within the max-depth limit. */
function quantitativeTemporalFieldError(input: {
  decision: TemporalDecision | null | undefined;
  aesthetic: "size" | "linewidth" | "alpha";
  field: string;
  temporalKind: unknown;
  parse: unknown;
  parseFailure: unknown;
  hasEpochParser: boolean;
  hasExplicitDomain: boolean;
  hasBinnedBreaks: boolean;
}): SpecError | null {
  const {
    decision,
    aesthetic,
    field,
    temporalKind,
    parse,
    parseFailure,
    hasEpochParser,
    hasExplicitDomain,
    hasBinnedBreaks,
  } = input;
  const mismatch: SpecError = {
    code: "scale-type-mismatch",
    path: `/scales/${aesthetic}`,
    message: `scales.${aesthetic} requests temporal values but field "${field}" is quantitative (numbers are not treated as temporal without a successful epoch parse).`,
    fix: {
      description: `Map a temporal field, use a working parse: { epoch: "ms" | "s" }, or remove temporal ${aesthetic} options.`,
    },
  };
  const censorRecovers = parseFailure === "censor" && (hasExplicitDomain || hasBinnedBreaks);
  if (decision === null || decision === undefined) {
    // Profile-backed: no samples. An epoch parser makes numbers temporal, but always as
    // `datetime`, so it can never satisfy a requested `date` kind — the runtime throws
    // style-temporal-kind. Reject that combination outright.
    if (hasEpochParser && typeof temporalKind === "string" && temporalKind !== "datetime") {
      return {
        code: "scale-type-mismatch",
        path: `/scales/${aesthetic}`,
        message: `scales.${aesthetic} requests temporal kind "${temporalKind}" but an epoch parser yields "datetime".`,
        fix: {
          description: `Set scales.${aesthetic}.temporalKind to "datetime", or use a parser that yields ${temporalKind} values.`,
        },
      };
    }
    // Otherwise defer only when the scale renders regardless of the eventual data — a
    // (kind-compatible) epoch parser, or censor recovery trained from parseable bounds.
    return hasEpochParser || censorRecovers ? null : mismatch;
  }
  const censoredInvalid =
    parse !== undefined &&
    parseFailure === "censor" &&
    decision.status === "invalid" &&
    ((decision.validatedCount ?? 0) > 0 || hasExplicitDomain || hasBinnedBreaks);
  if (decision.status !== "temporal" && !censoredInvalid) return mismatch;
  // temporalKind may be a schema-invalid non-string (e.g. a Symbol) reaching tier-2;
  // only compare/stringify when it is a valid string, else defer to the schema diagnostic.
  if (
    typeof temporalKind === "string" &&
    decision.kind !== null &&
    decision.kind !== undefined &&
    decision.kind !== temporalKind
  ) {
    return {
      code: "scale-type-mismatch",
      path: `/scales/${aesthetic}`,
      message: `scales.${aesthetic} requests temporal kind "${temporalKind}" but field "${field}" parses as "${decision.kind}".`,
      fix: {
        description: `Use the ${decision.kind ?? "matching"} ${aesthetic} helper or correct the source precision.`,
      },
    };
  }
  return null;
}

/** A scaled numeric-style constant is checked against the same resolution path the
 *  runtime uses (resolveNumericStyleValueView). Returns a mismatch error, or null when
 *  the constant resolves. Extracted so the per-constant branching does not nest under
 *  the aesthetic/constant loops (max-depth). */
function numericStyleConstantError(input: {
  value: unknown;
  aesthetic: "size" | "linewidth" | "alpha";
  configType: string;
  requestsTemporal: boolean;
  temporalKind: unknown;
  parseUsable: boolean;
  parser: Parameters<typeof parseTemporalColumn>[1];
  options: Parameters<typeof parseTemporalColumn>[2];
  censorRecovers: boolean;
}): SpecError | null {
  const {
    value,
    aesthetic,
    configType,
    requestsTemporal,
    temporalKind,
    parseUsable,
    parser,
    options,
    censorRecovers,
  } = input;
  if (!requestsTemporal) {
    // Non-temporal: accept exactly what cellToNumber() coerces to a finite number
    // (numbers, Dates, booleans, numeric strings, ISO strings); reject "large", "", null.
    if (scaledConstantCoercesToFinite(value)) return null;
    return {
      code: "scale-type-mismatch",
      path: `/scales/${aesthetic}`,
      message: `scales.${aesthetic}.type is "${configType}" but the scaled constant ${safeFormatConstant(value)} is not numeric; ${configType} ${aesthetic} scales need quantitative or temporal values.`,
      fix: {
        description: `Use a numeric scaled constant, or set scales.${aesthetic}.type to "ordinal".`,
        example: { type: "ordinal" },
      },
    };
  }
  // Temporal: a schema-invalid parser defers to the schema error; otherwise the constant
  // must resolve temporal (a Date is datetime), or be covered by censor recovery.
  if (!parseUsable) return null;
  let constantKind: string | null | undefined;
  if (value instanceof Date) {
    constantKind = "datetime";
  } else if (typeof value === "string" || typeof value === "number") {
    const decision = parseTemporalColumn(
      [value] as Parameters<typeof parseTemporalColumn>[0],
      parser,
      options,
    ).decision;
    constantKind = decision.status === "temporal" ? (decision.kind ?? null) : undefined;
  } else {
    // boolean, bigint, symbol, object, null: not a temporal constant, and must not be
    // handed to parseTemporalColumn — its evidence formatting (JSON.stringify) throws on
    // BigInt / unserializable objects. safeFormatConstant handles the message safely.
    constantKind = undefined;
  }
  if (constantKind === undefined) {
    if (censorRecovers) return null;
    return {
      code: "scale-type-mismatch",
      path: `/scales/${aesthetic}`,
      message: `scales.${aesthetic} requests temporal values but the scaled constant ${safeFormatConstant(value)} is not temporal; use a temporal constant or a working parse.`,
      fix: {
        description: `Use a temporal scaled constant, add a working parse: { epoch: "ms" | "s" }, or remove temporal ${aesthetic} options.`,
      },
    };
  }
  // The constant parses temporal; enforce the requested kind — the runtime throws
  // style-temporal-kind when a datetime constant is fed to a `date` scale (or vice versa).
  if (typeof temporalKind === "string" && constantKind !== null && constantKind !== temporalKind) {
    return {
      code: "scale-type-mismatch",
      path: `/scales/${aesthetic}`,
      message: `scales.${aesthetic} requests temporal kind "${temporalKind}" but the scaled constant ${safeFormatConstant(value)} parses as "${constantKind}".`,
      fix: {
        description: `Use a ${temporalKind} constant, or set scales.${aesthetic}.temporalKind to "${constantKind}".`,
      },
    };
  }
  return null;
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function dataChecks(
  spec: Record<string, unknown>,
  options: ValidateOptions,
  limits: ValidateLimits,
  /** Pre-resolved evidence from validate() so lint can share the same pass. */
  preResolved?: ResolveFieldEvidenceResult,
): SpecError[] {
  const errors: SpecError[] = [];
  // One cache per dataChecks call — shared by position and color checkers.
  const temporalDecisionCache = new Map<string, TemporalDecision | null | undefined>();
  const scales = isRecord(spec["scales"]) ? spec["scales"] : undefined;

  // Pre-evidence: temporal axis configuration (errors even without data/profile).
  const temporalConfig = validateTemporalAxisConfiguration(scales);
  errors.push(...temporalConfig.errors);
  const { invalidTemporalAxes } = temporalConfig;

  // Prefer per-layer evidence when available (#589); fall back to plot-level
  // resolveFieldEvidence for preResolved/lint sharing and profile mode.
  const layerResolved = resolveLayerFieldEvidence(spec, options, limits);
  if (layerResolved.status === "errors") return [...errors, ...layerResolved.errors];

  const resolved = preResolved ?? resolveFieldEvidence(spec, options, limits);
  if (resolved.status === "errors") return [...errors, ...resolved.errors];
  if (resolved.status === "none" && layerResolved.status === "none") return errors;
  const plotFields: FieldEvidenceMap | null =
    layerResolved.status === "ok"
      ? layerResolved.plot
      : resolved.status === "ok"
        ? resolved.fields
        : null;

  const plotAes = isRecord(spec["aes"]) ? (spec["aes"] as Aes) : undefined;
  const layers = Array.isArray(spec["layers"]) ? (spec["layers"] as unknown[]) : [];
  const scaleRequestsTimeForChannel = (channel: ChannelName): boolean => {
    const axis =
      channel === "x" || channel === "xmin" || channel === "xmax" || channel === "xend"
        ? "x"
        : channel === "y" || channel === "ymin" || channel === "ymax" || channel === "yend"
          ? "y"
          : null;
    return axis !== null && scaleRequestsTime(scales, axis);
  };

  const axisFields: Record<"x" | "y", ChannelFieldUse[]> = { x: [], y: [] };
  const colorFields: Record<"color" | "fill", ChannelFieldUse[]> = { color: [], fill: [] };
  const colorScaledConstants: Record<"color" | "fill", unknown[]> = { color: [], fill: [] };
  const finiteStyleFields: Record<"shape" | "linetype", ChannelFieldUse[]> = {
    shape: [],
    linetype: [],
  };
  const numericStyleFields: Record<"size" | "linewidth" | "alpha", ChannelFieldUse[]> = {
    size: [],
    linewidth: [],
    alpha: [],
  };
  const numericStyleScaledConstants: Record<"size" | "linewidth" | "alpha", unknown[]> = {
    size: [],
    linewidth: [],
    alpha: [],
  };

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (!isRecord(layer)) continue;
    const geom = typeof layer["geom"] === "string" ? layer["geom"] : "";
    const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
    const defaultStat = GEOM_DEFAULTS[geom as keyof typeof GEOM_DEFAULTS]?.stat ?? "identity";
    const stat = typeof layer["stat"] === "string" ? layer["stat"] : defaultStat;

    const fields: FieldEvidenceMap | null =
      layerResolved.status === "ok" ? (layerResolved.layers[i] ?? plotFields) : plotFields;
    if (fields === null) continue; // runtime-only named data: skip field checks
    const available = [...fields.keys()];

    // --- geom/stat field-type rules (M2 statistical layer) -----------------
    const fieldTypeOf = (channel: ChannelName): [string, ProfileFieldType] | null => {
      const m = effectiveChannel(plotAes, layerAes, channel);
      if (m === undefined || !("field" in m)) return null;
      const t = fields.get(m.field)?.type;
      if (t === undefined || t === null) return null;
      // Geom/stat contracts see position values after configured temporal parsing.
      // Parse failures and configuration errors are owned by scale validation below.
      return [m.field, scaleRequestsTimeForChannel(channel) ? "temporal" : t];
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
        if (
          info !== null &&
          (info[1] === "nominal" || info[1] === "ordinal") &&
          !scaleRequestsTime(scales, "y")
        ) {
          typeError(
            channel,
            `The errorbar geom needs quantitative bounds, but field "${info[0]}" (${channel}) is ${info[1]}.`,
            "Map the channel to a numeric field.",
          );
        }
      }
    }
    if (geom === "rect") {
      for (const channel of ["xmin", "xmax"] as const) {
        const info = fieldTypeOf(channel);
        if (
          info !== null &&
          (info[1] === "nominal" || info[1] === "ordinal") &&
          !scaleRequestsTime(scales, "x")
        ) {
          typeError(
            channel,
            `The rect geom needs quantitative edges, but field "${info[0]}" (${channel}) is ${info[1]}.`,
            "Map the channel to a numeric field.",
          );
        }
      }
      for (const channel of ["ymin", "ymax"] as const) {
        const info = fieldTypeOf(channel);
        if (
          info !== null &&
          (info[1] === "nominal" || info[1] === "ordinal") &&
          !scaleRequestsTime(scales, "y")
        ) {
          typeError(
            channel,
            `The rect geom needs quantitative edges, but field "${info[0]}" (${channel}) is ${info[1]}.`,
            "Map the channel to a numeric field.",
          );
        }
      }
    }
    if (geom === "raster") {
      for (const channel of ["x", "y"] as const) {
        const info = fieldTypeOf(channel);
        if (info !== null && (info[1] === "nominal" || info[1] === "ordinal")) {
          typeError(
            channel,
            `The raster geom needs continuous ${channel}, but field "${info[0]}" is ${info[1]}.`,
            'Use geom "tile" for discrete axes.',
          );
        }
      }
    }
    if (geom === "tile") {
      for (const channel of ["width", "height"] as const) {
        const info = fieldTypeOf(channel);
        if (info !== null && info[1] !== "quantitative") {
          typeError(
            channel,
            `The tile geom needs quantitative ${channel}, but field "${info[0]}" is ${info[1]}.`,
            `Map ${channel} to a positive numeric field, or use params.${channel}.`,
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
      if ("value" in mapped) {
        // Runtime trains manual/ordinal color domains on scaled constants too.
        if (
          (channel === "color" || channel === "fill") &&
          mapped.scale === true &&
          mapped.value !== null
        ) {
          colorScaledConstants[channel].push(mapped.value);
        }
        // The runtime trains numeric style scales on scaled constants as well, so
        // a scaled string constant on a sequential/binned size/linewidth/alpha
        // scale must face the same scale-family check as a mapped field below.
        if (
          (channel === "size" || channel === "linewidth" || channel === "alpha") &&
          mapped.scale === true &&
          mapped.value !== null
        ) {
          numericStyleScaledConstants[channel].push(mapped.value);
        }
        continue;
      }
      if (!("field" in mapped)) continue;

      const info = fields.get(mapped.field);
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
      if (channel === "x" || channel === "xmin" || channel === "xmax" || channel === "xend") {
        axisFields.x.push({ field: mapped.field, path });
      }
      if (channel === "y" || channel === "ymin" || channel === "ymax" || channel === "yend") {
        axisFields.y.push({ field: mapped.field, path });
      }
      if (channel === "color" || channel === "fill") {
        colorFields[channel].push({ field: mapped.field, path });
      }
      if (channel === "shape" || channel === "linetype") {
        finiteStyleFields[channel].push({ field: mapped.field, path });
      }
      if (channel === "size" || channel === "linewidth" || channel === "alpha") {
        numericStyleFields[channel].push({ field: mapped.field, path });
      }
    }
  }

  // --- scale/type compatibility (order preserved for diagnostics) ------------
  // Union layer evidence for global scale checks (same field name across layers
  // is last-wins; per-layer unknown-field already used layer-local maps above).
  const fields: FieldEvidenceMap = new Map(plotFields ?? undefined);
  if (layerResolved.status === "ok") {
    for (const layerMap of layerResolved.layers) {
      if (layerMap === null) continue;
      for (const [name, entry] of layerMap) fields.set(name, entry);
    }
  }
  if (fields.size === 0 && resolved.status === "ok") {
    for (const [name, entry] of resolved.fields) fields.set(name, entry);
  }
  const typeOf = (field: string) => fields.get(field)?.type ?? null;
  for (const aesthetic of ["shape", "linetype"] as const) {
    const config = scales?.[aesthetic] as { type?: string } | undefined;
    if (config?.type !== undefined) continue;
    for (const use of finiteStyleFields[aesthetic]) {
      const type = typeOf(use.field);
      if (type !== "quantitative" && type !== "temporal") continue;
      // A binned finite style requires numeric values: the runtime rejects
      // temporal (date/datetime) values with `unsupported-aesthetic-scale`
      // ("cannot be mapped to named symbols", scale-style.ts). So only
      // quantitative fields may be directed to "binned"; temporal fields must
      // use "ordinal", which keys arbitrary values (Dates included) to symbols.
      const isTemporal = type === "temporal";
      errors.push({
        code: "scale-type-mismatch",
        path: `/scales/${aesthetic}`,
        message: `Field "${use.field}" is ${type}, but ${aesthetic} has finite symbols and cannot infer continuous interpolation.`,
        fix: {
          description: isTemporal
            ? `Set scales.${aesthetic}.type to "ordinal"; temporal (date/datetime) values cannot be binned onto named symbols.`
            : `Set scales.${aesthetic}.type to "binned", or explicitly choose "ordinal" for identifier-like values.`,
          example: { type: isTemporal ? "ordinal" : "binned" },
        },
      });
    }
  }

  // Numeric style scales (size/linewidth/alpha) mirror the sequential/binned
  // color check: a continuous ramp needs quantitative or temporal values, so a
  // nominal/ordinal field trains no finite domain and the runtime throws
  // `style-domain-empty` (scale-style.ts). Reject it at validation time with the
  // same "use ordinal" guidance color scales give. Fields without an explicit
  // sequential/binned type default to an ordinal numeric style and are fine.
  for (const aesthetic of ["size", "linewidth", "alpha"] as const) {
    const config = scales?.[aesthetic] as
      | {
          type?: string;
          temporalKind?: unknown;
          parse?: unknown;
          timezone?: unknown;
          disambiguation?: unknown;
          domain?: unknown;
          parseFailure?: unknown;
          breaks?: unknown;
        }
      | undefined;
    if (config?.type !== "sequential" && config?.type !== "binned") continue;
    const requestsTemporal =
      config.temporalKind !== undefined ||
      config.parse !== undefined ||
      config.timezone !== undefined ||
      config.disambiguation !== undefined;
    // Config-level temporal facts, shared by the field checks and the scaled-constant
    // checks below (both mirror the runtime resolveNumericStyleValueView path).
    // A schema-invalid parser or option (e.g. a Symbol timezone) reaches tier-2 (schema
    // errors don't short-circuit it); handing it to the temporal helpers throws in their
    // cache-key/evidence formatting instead of yielding the schema diagnostic, so gate
    // every temporal call on the inputs being usable and defer otherwise.
    const parseUsable = temporalParserUsable(config.parse);
    const temporalOptionsUsable =
      (config.timezone === undefined || typeof config.timezone === "string") &&
      (config.disambiguation === undefined || typeof config.disambiguation === "string");
    const temporalInputsUsable = parseUsable && temporalOptionsUsable;
    const parser = (config.parse ?? "auto") as Parameters<typeof parseTemporalColumn>[1];
    const temporalOptions = {
      ...(config.timezone !== undefined && { timezone: config.timezone }),
      ...(config.disambiguation !== undefined && { disambiguation: config.disambiguation }),
    } as Parameters<typeof parseTemporalColumn>[2];
    // Only an epoch parser turns quantitative (numeric) values temporal at runtime.
    const hasEpochParser =
      typeof config.parse === "object" && config.parse !== null && "epoch" in config.parse;
    // A censor-recovery bound (explicit domain / binned breaks) only rescues an
    // otherwise-invalid temporal column if a usable, explicit parser can actually parse
    // it. Without a parser the runtime infers a non-temporal auto parser and throws
    // style-domain-invalid / style-binned-breaks, so require parseability before
    // treating either as a recovery bound (matches numericSequentialResolution).
    const parseableBound = (value: unknown): boolean =>
      temporalInputsUsable &&
      config.parse !== undefined &&
      parseTemporal(value, config.parse as Parameters<typeof parseTemporal>[1], temporalOptions).ok;
    const domainValues = Array.isArray(config.domain)
      ? config.domain.filter((value) => value !== null)
      : [];
    const hasExplicitDomain =
      domainValues.length === 2 && domainValues.every((value) => parseableBound(value));
    const binnedBreaks =
      config.type === "binned" && Array.isArray(config.breaks)
        ? config.breaks.filter((value) => value !== null)
        : [];
    const hasBinnedBreaks =
      binnedBreaks.length >= 2 && binnedBreaks.every((value) => parseableBound(value));
    // A temporal field with real parseable values trains the scale, so an invalid
    // censored scaled constant sharing it is censored to the unknown style rather than
    // rejected (the same partial-invalid path fields already accept). Track it here to
    // extend censor recovery to the scaled-constant check below.
    let fieldTrainsScale = false;
    for (const use of numericStyleFields[aesthetic]) {
      const type = typeOf(use.field);
      // A temporal-typed field always trains the scale (extends censor recovery below).
      if (type === "temporal") fieldTrainsScale = true;
      // A quantitative field carrying temporal options fails at resolve time
      // unless a working parser (or censor recovery) yields temporal values —
      // mirror the color checker rather than deferring unconditionally.
      if (type === "quantitative" && requestsTemporal) {
        // Defer to the schema diagnostic when the parser/options are schema-invalid.
        if (!temporalInputsUsable) continue;
        const decision = temporalDecisionForField(
          temporalDecisionCache,
          use.field,
          fields.get(use.field),
          parser as Parameters<typeof temporalDecisionForField>[3],
          temporalOptions as Parameters<typeof temporalDecisionForField>[4],
        );
        // A field that parses (fully or partially) trains the scale from data.
        fieldTrainsScale ||=
          decision !== null &&
          decision !== undefined &&
          (decision.status === "temporal" || (decision.validatedCount ?? 0) > 0);
        const error = quantitativeTemporalFieldError({
          decision,
          aesthetic,
          field: use.field,
          temporalKind: config.temporalKind,
          parse: config.parse,
          parseFailure: config.parseFailure,
          hasEpochParser,
          hasExplicitDomain,
          hasBinnedBreaks,
        });
        if (error !== null) errors.push(error);
      }
      // A nominal/ordinal field trains no finite domain and the runtime throws
      // `style-domain-empty`; reject it with the same "use ordinal" guidance color
      // scales give. A nominal field carrying temporal options may still resolve
      // to temporal at runtime, so defer (mirror the color checker).
      if (type !== "nominal" && type !== "ordinal") continue;
      if (requestsTemporal) continue;
      errors.push({
        code: "scale-type-mismatch",
        path: `/scales/${aesthetic}`,
        message: `scales.${aesthetic}.type is "${config.type}" but field "${use.field}" is ${type}; ${config.type} ${aesthetic} scales need quantitative or temporal values.`,
        fix: {
          description: `Set scales.${aesthetic}.type to "ordinal", or map a quantitative field.`,
          example: { type: "ordinal" },
        },
      });
    }
    // Scaled constants train the same numeric scale, so a constant the scale can't
    // resolve throws at runtime (style-domain-empty / style-temporal-parse). Reject
    // it here too, mirroring the field checks above for both resolution paths.
    const censorRecovers =
      config.parseFailure === "censor" &&
      (hasExplicitDomain || hasBinnedBreaks || fieldTrainsScale);
    for (const value of numericStyleScaledConstants[aesthetic]) {
      const error = numericStyleConstantError({
        value,
        aesthetic,
        configType: config.type,
        requestsTemporal,
        temporalKind: config.temporalKind,
        parseUsable: temporalInputsUsable,
        parser,
        options: temporalOptions,
        censorRecovers,
      });
      if (error !== null) errors.push(error);
    }
  }

  errors.push(
    ...checkPositionScaleDataCompatibility({
      scales,
      fields,
      axisFields,
      invalidTemporalAxes,
      temporalDecisionCache,
    }),
    ...checkColorScaleDataCompatibility({
      scales,
      fields,
      colorFields,
      colorScaledConstants,
      temporalDecisionCache,
    }),
  );

  return errors;
}
