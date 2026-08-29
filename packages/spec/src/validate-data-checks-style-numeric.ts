/**
 * Size/linewidth/alpha sequential/binned data-aware scale checks (incl. temporal).
 * Barrel: validate-data-checks-style.ts. Orchestrator: validate-data-checks.ts.
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

type NumericStyleConfig = {
  type?: string;
  temporalKind?: unknown;
  parse?: unknown;
  timezone?: unknown;
  disambiguation?: unknown;
  domain?: unknown;
  parseFailure?: unknown;
  breaks?: unknown;
};

type NumericStyleFacts = {
  requestsTemporal: boolean;
  temporalInputsUsable: boolean;
  parser: Parameters<typeof parseTemporalColumn>[1];
  temporalOptions: Parameters<typeof parseTemporalColumn>[2];
  hasEpochParser: boolean;
  hasExplicitDomain: boolean;
  hasBinnedBreaks: boolean;
};

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
    return profileQuantitativeTemporalError({
      aesthetic,
      temporalKind,
      hasEpochParser,
      censorRecovers,
      mismatch,
    });
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

function profileQuantitativeTemporalError(input: {
  aesthetic: "size" | "linewidth" | "alpha";
  temporalKind: unknown;
  hasEpochParser: boolean;
  censorRecovers: boolean;
  mismatch: SpecError;
}): SpecError | null {
  const { aesthetic, temporalKind, hasEpochParser, censorRecovers, mismatch } = input;
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
  return hasEpochParser || censorRecovers ? null : mismatch;
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
    const config = scales?.[aesthetic] as NumericStyleConfig | undefined;
    if (config?.type !== "sequential" && config?.type !== "binned") continue;
    const facts = numericStyleFacts(config);
    // Pass 1: channel-wide training sources (sibling fields + scaled constants).
    // Runtime trains sequential/binned style scales from the full channel value
    // list, so an all-invalid field/constant is censored when any sibling trains.
    const channelTrains = numericStyleChannelTrains({
      uses: numericStyleFields[aesthetic],
      constants: numericStyleScaledConstants[aesthetic],
      evidenceOf,
      typeOf,
      cache: temporalDecisionCache,
      facts,
    });

    // Pass 2: field diagnostics (use channel-wide censor recovery).
    for (const use of numericStyleFields[aesthetic]) {
      const type = typeOf(use);
      // A quantitative field carrying temporal options fails at resolve time
      // unless a working parser (or censor recovery) yields temporal values —
      // mirror the color checker rather than deferring unconditionally.
      if (type === "quantitative" && facts.requestsTemporal) {
        // Defer to the schema diagnostic when the parser/options are schema-invalid.
        if (!facts.temporalInputsUsable) continue;
        const decision = temporalDecisionForField(
          temporalDecisionCache,
          use.field,
          evidenceOf(use),
          facts.parser as Parameters<typeof temporalDecisionForField>[3],
          facts.temporalOptions as Parameters<typeof temporalDecisionForField>[4],
        );
        const error = quantitativeTemporalFieldError({
          decision,
          aesthetic,
          field: use.field,
          temporalKind: config.temporalKind,
          parse: config.parse,
          parseFailure: config.parseFailure,
          hasEpochParser: facts.hasEpochParser,
          hasExplicitDomain: facts.hasExplicitDomain,
          hasBinnedBreaks: facts.hasBinnedBreaks,
          channelTrains,
        });
        if (error !== null) errors.push(error);
      }
      // A nominal/ordinal field trains no finite domain and the runtime throws
      // `style-domain-empty`; reject it with the same "use ordinal" guidance color
      // scales give. A nominal field carrying temporal options may still resolve
      // to temporal at runtime, so defer (mirror the color checker).
      if (type !== "nominal" && type !== "ordinal") continue;
      if (facts.requestsTemporal) continue;
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
      (facts.hasExplicitDomain || facts.hasBinnedBreaks || channelTrains);
    for (const value of numericStyleScaledConstants[aesthetic]) {
      const error = numericStyleConstantError({
        value,
        aesthetic,
        configType: config.type,
        requestsTemporal: facts.requestsTemporal,
        temporalKind: config.temporalKind,
        parseUsable: facts.temporalInputsUsable,
        parser: facts.parser,
        options: facts.temporalOptions,
        censorRecovers,
      });
      if (error !== null) errors.push(error);
    }
  }
  return errors;
}

function numericStyleFacts(config: NumericStyleConfig): NumericStyleFacts {
  const requestsTemporal = [
    config.temporalKind,
    config.parse,
    config.timezone,
    config.disambiguation,
  ].some((value) => value !== undefined);
  const temporalInputsUsable =
    temporalParserUsable(config.parse) &&
    (config.timezone === undefined || typeof config.timezone === "string") &&
    (config.disambiguation === undefined || typeof config.disambiguation === "string");
  const parser = (config.parse ?? "auto") as Parameters<typeof parseTemporalColumn>[1];
  const temporalOptions = {
    ...(config.timezone !== undefined && { timezone: config.timezone }),
    ...(config.disambiguation !== undefined && { disambiguation: config.disambiguation }),
  } as Parameters<typeof parseTemporalColumn>[2];
  const parseableBound = (value: unknown): boolean =>
    temporalInputsUsable &&
    config.parse !== undefined &&
    parseTemporal(value, config.parse as Parameters<typeof parseTemporal>[1], temporalOptions).ok;
  const domainValues = Array.isArray(config.domain) ? config.domain.filter(nonNull) : [];
  const binnedBreaks =
    config.type === "binned" && Array.isArray(config.breaks) ? config.breaks.filter(nonNull) : [];
  return {
    requestsTemporal,
    temporalInputsUsable,
    parser,
    temporalOptions,
    hasEpochParser:
      typeof config.parse === "object" && config.parse !== null && "epoch" in config.parse,
    hasExplicitDomain:
      domainValues.length === 2 && domainValues.every((value) => parseableBound(value)),
    hasBinnedBreaks:
      binnedBreaks.length >= 2 && binnedBreaks.every((value) => parseableBound(value)),
  };
}

function nonNull(value: unknown): boolean {
  return value !== null;
}

function numericStyleChannelTrains(input: {
  uses: ChannelFieldUse[];
  constants: unknown[];
  evidenceOf: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined;
  typeOf: (use: ChannelFieldUse) => FieldEvidenceEntry["type"] | null;
  cache: TemporalDecisionCache;
  facts: NumericStyleFacts;
}): boolean {
  const { uses, constants, evidenceOf, typeOf, cache, facts } = input;
  if (uses.some((use) => fieldTrainsNumericStyle(use, evidenceOf, typeOf, cache, facts)))
    return true;
  if (!facts.requestsTemporal || !facts.temporalInputsUsable) return false;
  return constants.some((value) => constantTrainsNumericStyle(value, facts));
}

function fieldTrainsNumericStyle(
  use: ChannelFieldUse,
  evidenceOf: (use: ChannelFieldUse) => FieldEvidenceEntry | undefined,
  typeOf: (use: ChannelFieldUse) => FieldEvidenceEntry["type"] | null,
  cache: TemporalDecisionCache,
  facts: NumericStyleFacts,
): boolean {
  const type = typeOf(use);
  if (type === "temporal") return true;
  if (type !== "quantitative" || !facts.requestsTemporal || !facts.temporalInputsUsable)
    return false;
  const decision = temporalDecisionForField(
    cache,
    use.field,
    evidenceOf(use),
    facts.parser as Parameters<typeof temporalDecisionForField>[3],
    facts.temporalOptions as Parameters<typeof temporalDecisionForField>[4],
  );
  return (
    decision !== null &&
    decision !== undefined &&
    (decision.status === "temporal" || (decision.validatedCount ?? 0) > 0)
  );
}

function constantTrainsNumericStyle(value: unknown, facts: NumericStyleFacts): boolean {
  if (value instanceof Date) return true;
  if (typeof value !== "string" && typeof value !== "number") return false;
  const decision = parseTemporalColumn(
    [value] as Parameters<typeof parseTemporalColumn>[0],
    facts.parser,
    facts.temporalOptions,
  ).decision;
  return decision.status === "temporal" || (decision.validatedCount ?? 0) > 0;
}
