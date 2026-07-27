/**
 * Style aesthetic data-aware scale checks (shape/linetype finite symbols;
 * size/linewidth/alpha sequential/binned + temporal).
 *
 * Field types prefer per-use evidenceForUse (same path as position #609) so
 * multi-table layers that share a field name keep their own type view (#844).
 * The last-wins union FieldEvidenceMap is only the fallback.
 *
 * Shared temporal memoization: validate-data-checks-temporal.ts.
 * Position: validate-data-checks-position.ts. Color: validate-data-checks-color.ts.
 * Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import { parseTemporalColumn, type TemporalDecision } from "./temporal-column.js";
import { parseTemporal } from "./temporal-parse.js";
import type { FieldEvidenceEntry, FieldEvidenceMap } from "./validate-data-evidence.js";
import {
  temporalDecisionForField,
  temporalParserUsable,
  type ChannelFieldUse,
  type TemporalDecisionCache,
} from "./validate-data-checks-temporal.js";

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
  /** Channel-wide training (sibling fields / scaled constants) for parseFailure: "censor". */
  channelTrains: boolean;
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
    channelTrains,
  } = input;
  const mismatch: SpecError = {
    code: "scale-type-mismatch",
    path: `/scales/${aesthetic}`,
    message: `scales.${aesthetic} requests temporal values but field "${field}" is quantitative (numbers are not treated as temporal without a successful epoch parse).`,
    fix: {
      description: `Map a temporal field, use a working parse: { epoch: "ms" | "s" }, or remove temporal ${aesthetic} options.`,
    },
  };
  const censorRecovers =
    parseFailure === "censor" && (hasExplicitDomain || hasBinnedBreaks || channelTrains);
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
    ((decision.validatedCount ?? 0) > 0 || hasExplicitDomain || hasBinnedBreaks || channelTrains);
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

/**
 * Shape/linetype: continuous fields need an explicit finite-style scale type.
 * Order: runs before numeric style / position / color so diagnostic order is stable.
 * Uses evidenceForUse when provided so multi-table same-name fields stay independent (#844).
 */
export function checkFiniteStyleScaleDataCompatibility(input: {
  scales: Record<string, unknown> | undefined;
  fields: FieldEvidenceMap;
  /**
   * Optional per-use evidence lookup. When provided, prefer it over the
   * last-wins `fields` union so multi-table layers with the same field name
   * keep their own type evidence (#609 / #844).
   */
  evidenceForUse?: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined;
  finiteStyleFields: Record<"shape" | "linetype", ChannelFieldUse[]>;
}): SpecError[] {
  const { scales, fields, finiteStyleFields } = input;
  const errors: SpecError[] = [];
  const evidenceOf = (use: ChannelFieldUse) => input.evidenceForUse?.(use) ?? fields.get(use.field);
  const typeOf = (use: ChannelFieldUse) => evidenceOf(use)?.type ?? null;
  for (const aesthetic of ["shape", "linetype"] as const) {
    const config = scales?.[aesthetic] as { type?: string } | undefined;
    if (config?.type !== undefined) continue;
    for (const use of finiteStyleFields[aesthetic]) {
      const type = typeOf(use);
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
  return errors;
}

/**
 * Size/linewidth/alpha sequential/binned scale vs field/constant types (incl. temporal).
 * Prefers per-use evidenceForUse over the last-wins union so multi-table same-name
 * fields keep independent types (#609 / #844).
 */
export function checkNumericStyleScaleDataCompatibility(input: {
  scales: Record<string, unknown> | undefined;
  fields: FieldEvidenceMap;
  /**
   * Optional per-use evidence lookup. When provided, prefer it over the
   * last-wins `fields` union so multi-table layers with the same field name
   * keep their own type evidence (#609 / #844).
   */
  evidenceForUse?: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined;
  numericStyleFields: Record<"size" | "linewidth" | "alpha", ChannelFieldUse[]>;
  numericStyleScaledConstants: Record<"size" | "linewidth" | "alpha", unknown[]>;
  temporalDecisionCache: TemporalDecisionCache;
}): SpecError[] {
  const { scales, fields, numericStyleFields, numericStyleScaledConstants, temporalDecisionCache } =
    input;
  const errors: SpecError[] = [];
  const evidenceOf = (use: ChannelFieldUse) => input.evidenceForUse?.(use) ?? fields.get(use.field);
  const typeOf = (use: ChannelFieldUse) => evidenceOf(use)?.type ?? null;
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
    // Pass 1: channel-wide training sources (sibling fields + scaled constants).
    // Runtime trains sequential/binned style scales from the full channel value
    // list, so an all-invalid field/constant is censored when any sibling trains.
    let fieldTrainsScale = false;
    for (const use of numericStyleFields[aesthetic]) {
      const type = typeOf(use);
      if (type === "temporal") {
        fieldTrainsScale = true;
        continue;
      }
      if (type !== "quantitative" || !requestsTemporal || !temporalInputsUsable) continue;
      const decision = temporalDecisionForField(
        temporalDecisionCache,
        use.field,
        evidenceOf(use),
        parser as Parameters<typeof temporalDecisionForField>[3],
        temporalOptions as Parameters<typeof temporalDecisionForField>[4],
      );
      fieldTrainsScale ||=
        decision !== null &&
        decision !== undefined &&
        (decision.status === "temporal" || (decision.validatedCount ?? 0) > 0);
    }
    let constantTrainsScale = false;
    if (requestsTemporal && temporalInputsUsable) {
      for (const value of numericStyleScaledConstants[aesthetic]) {
        if (value instanceof Date) {
          constantTrainsScale = true;
          break;
        }
        if (typeof value !== "string" && typeof value !== "number") continue;
        const decision = parseTemporalColumn(
          [value] as Parameters<typeof parseTemporalColumn>[0],
          parser,
          temporalOptions,
        ).decision;
        if (decision.status === "temporal" || (decision.validatedCount ?? 0) > 0) {
          constantTrainsScale = true;
          break;
        }
      }
    }
    const channelTrains = fieldTrainsScale || constantTrainsScale;

    // Pass 2: field diagnostics (use channel-wide censor recovery).
    for (const use of numericStyleFields[aesthetic]) {
      const type = typeOf(use);
      // A quantitative field carrying temporal options fails at resolve time
      // unless a working parser (or censor recovery) yields temporal values —
      // mirror the color checker rather than deferring unconditionally.
      if (type === "quantitative" && requestsTemporal) {
        // Defer to the schema diagnostic when the parser/options are schema-invalid.
        if (!temporalInputsUsable) continue;
        const decision = temporalDecisionForField(
          temporalDecisionCache,
          use.field,
          evidenceOf(use),
          parser as Parameters<typeof temporalDecisionForField>[3],
          temporalOptions as Parameters<typeof temporalDecisionForField>[4],
        );
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
          channelTrains,
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
      config.parseFailure === "censor" && (hasExplicitDomain || hasBinnedBreaks || channelTrains);
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
  return errors;
}
