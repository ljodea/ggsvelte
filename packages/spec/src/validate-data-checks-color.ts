/**
 * Color/fill data-aware scale checks (manual domain/range, sequential, temporal).
 * Shared temporal memoization: validate-data-checks-temporal.ts.
 * Position: validate-data-checks-position.ts. Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import { configuredColorScaleType } from "./scale-helpers.js";
import type { ColorScaleSpec } from "./schema.js";
import { SEQUENTIAL_SCHEME_NAMES } from "./schema.js";
import { parseTemporalColumn } from "./temporal-column.js";
import type { FieldEvidenceMap } from "./validate-data-evidence.js";
import {
  temporalDecisionForField,
  temporalParserUsable,
  type ChannelFieldUse,
  type TemporalDecisionCache,
} from "./validate-data-checks-temporal.js";

const COLOR_CHANNELS = ["color", "fill"] as const;
const SEQUENTIAL_SCHEMES = new Set<string>(SEQUENTIAL_SCHEME_NAMES);

/**
 * Recovery sources for `parseFailure: "censor"` on temporal color/fill scales.
 * Mirrors runtime `collectColorChannelValues` + sequential/binned train:
 * - domain endpoints must parse (else color-domain-invalid / color-binned-domain);
 *   a present-but-unusable domain blocks all recovery (runtime throws first)
 * - binned breaks of length ≥ 2 must parse and be strictly increasing
 * - sibling fields / scaled constants train only when they parse under the
 *   configured parser (and match temporalKind when authored)
 */
function colorTemporalCensorRecovery(input: {
  config: ColorScaleSpec | undefined;
  colorFields: readonly ChannelFieldUse[];
  colorScaledConstants: readonly unknown[];
  fields: FieldEvidenceMap;
  temporalDecisionCache: TemporalDecisionCache;
  typeOf: (field: string) => string | null;
}): {
  hasExplicitDomain: boolean;
  hasBinnedBreaks: boolean;
  /** Authored domain exists but is not a usable two-endpoint train bound. */
  domainBlocksRecovery: boolean;
  trainingFields: ReadonlySet<string>;
  constantTrains: boolean;
  /**
   * A channel value (scaled constant or sibling field) parses under the
   * configured/auto parser but conflicts with temporalKind — runtime still
   * includes it in collectColorChannelValues and throws color-temporal-kind.
   */
  kindConflicts: boolean;
  conflictingKind: string | null;
} {
  const { config, colorFields, colorScaledConstants, fields, temporalDecisionCache, typeOf } =
    input;
  const parseUsable = temporalParserUsable(config?.parse);
  const temporalOptionsUsable =
    (config?.timezone === undefined || typeof config.timezone === "string") &&
    (config?.disambiguation === undefined || typeof config.disambiguation === "string");
  const temporalInputsUsable = parseUsable && temporalOptionsUsable;
  const temporalOptions = {
    ...(config?.timezone !== undefined &&
      typeof config.timezone === "string" && { timezone: config.timezone }),
    ...(config?.disambiguation !== undefined &&
      typeof config.disambiguation === "string" && {
        disambiguation: config.disambiguation,
      }),
  };
  // Runtime uses config?.parse ?? "auto" in resolveColorValueView — kind-conflict
  // detection must do the same (not only when parse is explicit). parseTemporal does
  // not accept "auto", so column parsing is the shared path for both cases.
  const parser: Parameters<typeof temporalDecisionForField>[3] = config?.parse ?? "auto";
  const parseBound = (value: unknown): { epochMs: number; kind: string | undefined } | null => {
    if (!temporalInputsUsable) return null;
    if (value === null || value === undefined) return null;
    if (!(value instanceof Date) && typeof value !== "string" && typeof value !== "number") {
      return null;
    }
    const column = parseTemporalColumn(
      [value] as Parameters<typeof parseTemporalColumn>[0],
      parser,
      temporalOptions,
    );
    if (column.valid[0] !== 1) return null;
    const epochMs = column.semantic[0];
    if (epochMs === undefined || !Number.isFinite(epochMs)) return null;
    return { epochMs, kind: column.decision.kind ?? undefined };
  };

  const domainValues = Array.isArray(config?.domain)
    ? config.domain.filter((value) => value !== null)
    : [];
  const hasExplicitDomain =
    domainValues.length === 2 && domainValues.every((value) => parseBound(value) !== null);
  // Runtime throws color-domain-invalid / color-binned-domain whenever domain is
  // authored but not exactly two parseable endpoints — before siblings/breaks train.
  const domainBlocksRecovery = Array.isArray(config?.domain) && !hasExplicitDomain;

  // Do not drop null breaks: runtime maps every authored break and throws
  // color-binned-breaks when any maps to undefined.
  const authoredBreaks =
    config?.type === "binned" && Array.isArray(config.breaks) ? config.breaks : [];
  const parsedBreakEpochs: number[] = [];
  let hasBinnedBreaks = false;
  if (authoredBreaks.length >= 2) {
    let allParseable = true;
    for (const value of authoredBreaks) {
      if (value === null) {
        allParseable = false;
        break;
      }
      const parsed = parseBound(value);
      if (parsed === null) {
        allParseable = false;
        break;
      }
      parsedBreakEpochs.push(parsed.epochMs);
    }
    if (allParseable && parsedBreakEpochs.length >= 2) {
      hasBinnedBreaks = true;
      for (let index = 1; index < parsedBreakEpochs.length; index++) {
        const prev = parsedBreakEpochs[index - 1];
        const current = parsedBreakEpochs[index];
        if (prev === undefined || current === undefined || current <= prev) {
          hasBinnedBreaks = false;
          break;
        }
      }
    }
  }

  const trainingFields = new Set<string>();
  let kindConflicts = false;
  let conflictingKind: string | null = null;
  const requestsTemporal =
    config?.temporalKind !== undefined ||
    config?.parse !== undefined ||
    config?.timezone !== undefined ||
    config?.disambiguation !== undefined;
  if (temporalInputsUsable && requestsTemporal) {
    for (const use of colorFields) {
      const type = typeOf(use.field);
      // Always reparse under the configured parser — type:"temporal" from default
      // evidence does not mean the value trains when parse is an explicit override.
      if (
        type !== "temporal" &&
        type !== "quantitative" &&
        type !== "nominal" &&
        type !== "ordinal"
      ) {
        continue;
      }
      const decision = temporalDecisionForField(
        temporalDecisionCache,
        use.field,
        fields.get(use.field),
        parser,
        temporalOptions,
      );
      if (decision === null || decision === undefined) continue;
      const trains = decision.status === "temporal" || (decision.validatedCount ?? 0) > 0;
      if (!trains) continue;
      if (
        typeof config?.temporalKind === "string" &&
        decision.kind !== null &&
        decision.kind !== undefined &&
        decision.kind !== config.temporalKind
      ) {
        kindConflicts = true;
        conflictingKind = decision.kind;
        continue;
      }
      trainingFields.add(use.field);
    }
  }

  const kindOk = (kind: string | undefined): boolean =>
    config?.temporalKind === undefined || kind === undefined || kind === config.temporalKind;
  let constantTrains = false;
  for (const value of colorScaledConstants) {
    const parsed = parseBound(value);
    if (parsed === null) continue;
    if (kindOk(parsed.kind)) {
      constantTrains = true;
    } else {
      kindConflicts = true;
      conflictingKind = parsed.kind ?? null;
    }
  }
  return {
    hasExplicitDomain,
    hasBinnedBreaks,
    domainBlocksRecovery,
    trainingFields,
    constantTrains,
    kindConflicts,
    conflictingKind,
  };
}

function censoredTemporalColorRecovers(input: {
  config: ColorScaleSpec | undefined;
  decision: { status: string; validatedCount?: number } | null | undefined;
  field: string;
  recovery: {
    hasExplicitDomain: boolean;
    hasBinnedBreaks: boolean;
    domainBlocksRecovery: boolean;
    trainingFields: ReadonlySet<string>;
    constantTrains: boolean;
    kindConflicts: boolean;
  };
}): boolean {
  if (input.config?.parse === undefined || input.config.parseFailure !== "censor") return false;
  if (input.decision?.status !== "invalid") return false;
  // A present-but-unusable domain always throws at runtime before recovery sources apply.
  if (input.recovery.domainBlocksRecovery) return false;
  // Kind-mismatched channel values still train and throw color-temporal-kind.
  if (input.recovery.kindConflicts) return false;
  if ((input.decision.validatedCount ?? 0) > 0) return true;
  if (input.recovery.hasExplicitDomain || input.recovery.hasBinnedBreaks) return true;
  if (input.recovery.constantTrains) return true;
  for (const field of input.recovery.trainingFields) {
    if (field !== input.field) return true;
  }
  return false;
}

/** Type-preserving key for discrete domain identity (mirrors core encodeKey). */
function discreteDomainKey(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value.startsWith("@") ? "@" + value : value;
    case "number":
      if (Number.isNaN(value)) return "@n:NaN";
      if (Object.is(value, -0)) return "@n:-0";
      return "@n:" + String(value);
    case "boolean":
      return "@b:" + String(value);
    case "bigint":
      return "@i:" + value.toString();
    case "undefined":
      return "@undefined";
    default:
      if (value === null) return "@null";
      if (value instanceof Date) {
        const t = value.getTime();
        return "@d:" + (Number.isNaN(t) ? "NaN" : String(t));
      }
      return JSON.stringify(value);
  }
}

/** Exact domain size, or a lower bound when some field values are unknown. */
type ManualDomainEstimate = { readonly kind: "exact" | "min"; readonly size: number };

function expectedManualDomainLength(
  domain: unknown,
  fieldValueLists: readonly (readonly unknown[] | null | undefined)[],
  scaledConstants: readonly unknown[] = [],
): ManualDomainEstimate | null {
  if (Array.isArray(domain)) {
    return { kind: "exact", size: domain.filter((value) => value !== null).length };
  }
  // DataProfile fields have values: null. Unknown field values disable an
  // exact inference, but known scaled constants still yield a lower bound
  // (runtime domain is at least those constants, plus any field categories).
  const seen = new Set<string>();
  let sawValues = false;
  let unknownFieldValues = false;
  for (const values of fieldValueLists) {
    if (values === null || values === undefined) {
      unknownFieldValues = true;
      continue;
    }
    sawValues = true;
    for (const value of values) {
      if (value === null) continue;
      seen.add(discreteDomainKey(value));
    }
  }
  for (const value of scaledConstants) {
    if (value === null) continue;
    sawValues = true;
    seen.add(discreteDomainKey(value));
  }
  if (!sawValues) return null;
  return { kind: unknownFieldValues ? "min" : "exact", size: seen.size };
}

/** Post-layer color/fill scale type compatibility against collected field uses. */
export function checkColorScaleDataCompatibility(input: {
  scales: Record<string, unknown> | undefined;
  fields: FieldEvidenceMap;
  colorFields: Record<"color" | "fill", ChannelFieldUse[]>;
  /** Scaled constants (`{ value, scale: true }`) included in runtime domain training. */
  colorScaledConstants?: Record<"color" | "fill", readonly unknown[]>;
  temporalDecisionCache: TemporalDecisionCache;
}): SpecError[] {
  const { scales, fields, colorFields, temporalDecisionCache } = input;
  const colorScaledConstants = input.colorScaledConstants ?? { color: [], fill: [] };
  const errors: SpecError[] = [];
  const typeOf = (field: string) => fields.get(field)?.type ?? null;

  for (const channel of COLOR_CHANNELS) {
    const config = scales?.[channel] as ColorScaleSpec | undefined;
    const effectiveType = configuredColorScaleType(config);

    // Manual range length vs domain / inferred unique values (union across layers).
    if ((effectiveType === "manual" || config?.type === "manual") && Array.isArray(config?.range)) {
      const range = config.range;
      const expected = expectedManualDomainLength(
        config.domain,
        colorFields[channel].map((use) => fields.get(use.field)?.values),
        colorScaledConstants[channel],
      );
      const rangeMismatch =
        expected !== null &&
        (expected.kind === "exact" ? range.length !== expected.size : range.length < expected.size);
      if (rangeMismatch && expected !== null) {
        errors.push({
          code: "scale-manual-domain-range",
          path: `/scales/${channel}`,
          message:
            expected.kind === "exact"
              ? `The manual ${channel} scale needs one range color per domain value (${String(expected.size)} values, ${String(range.length)} colors).`
              : `The manual ${channel} scale has at least ${String(expected.size)} known domain values (scaled constants and/or observed categories) but only ${String(range.length)} range colors.`,
          fix: {
            description: `Provide at least ${String(expected.size)} range colors, or set scales.${channel}.domain explicitly to match the range length.`,
          },
        });
      }
    }

    const inferredFromSequentialScheme =
      config?.type === undefined &&
      config?.range === undefined &&
      config?.scheme !== undefined &&
      SEQUENTIAL_SCHEMES.has(config.scheme);
    if (effectiveType !== "sequential" && effectiveType !== "binned") continue;

    const requestsTemporal =
      config?.temporalKind !== undefined ||
      config?.parse !== undefined ||
      config?.timezone !== undefined ||
      config?.disambiguation !== undefined;
    const recovery = colorTemporalCensorRecovery({
      config,
      colorFields: colorFields[channel],
      colorScaledConstants: colorScaledConstants[channel],
      fields,
      temporalDecisionCache,
      typeOf,
    });
    // Runtime collects all channel values into one temporal column; a kind
    // conflict (sibling field or scaled constant) throws color-temporal-kind.
    if (
      recovery.kindConflicts &&
      typeof config?.temporalKind === "string" &&
      recovery.conflictingKind !== null
    ) {
      errors.push({
        code: "scale-type-mismatch",
        path: `/scales/${channel}`,
        message: `scales.${channel} requests temporal kind "${config.temporalKind}" but a channel value parses as "${recovery.conflictingKind}".`,
        fix: {
          description: `Use ${config.temporalKind} values for every color mapping and scaled constant, or set temporalKind to "${recovery.conflictingKind}".`,
        },
      });
    }

    for (const use of colorFields[channel]) {
      const type = typeOf(use.field);
      if (
        type === "temporal" &&
        config?.transform !== undefined &&
        config.transform !== "identity"
      ) {
        errors.push({
          code: "scale-type-mismatch",
          path: use.path,
          message: `scales.${channel}.transform is "${config.transform}" but field "${use.field}" is temporal; temporal color scales permit only the identity transform.`,
          fix: {
            description: `Remove scales.${channel}.transform to keep temporal inference, or map a non-temporal quantitative field.`,
          },
        });
        continue;
      }

      // Quantitative fields with temporal-only options fail at resolve time unless
      // parseFailure: "censor" recovers via this field, a sibling, a scaled constant,
      // or a parseable domain / binned breaks (pipeline only throws color-transform-empty
      // when every channel value fails and no authored bound trains the scale).
      if (type === "quantitative" && requestsTemporal) {
        // A schema-invalid parser reaches tier-2 (schema errors don't short-circuit
        // it); handing it to temporalDecisionForField would throw instead of
        // yielding the schema diagnostic. Defer to that diagnostic.
        if (!temporalParserUsable(config?.parse)) continue;
        const info = fields.get(use.field);
        const decision = temporalDecisionForField(
          temporalDecisionCache,
          use.field,
          info,
          config?.parse ?? "auto",
          {
            ...(config?.timezone !== undefined && { timezone: config.timezone }),
            ...(config?.disambiguation !== undefined && {
              disambiguation: config.disambiguation,
            }),
          },
        );
        const censoredInvalid = censoredTemporalColorRecovers({
          config,
          decision,
          field: use.field,
          recovery,
        });
        if (decision?.status !== "temporal" && !censoredInvalid) {
          errors.push({
            code: "scale-type-mismatch",
            path: use.path,
            message: `scales.${channel} requests temporal colors but field "${use.field}" is quantitative (numbers are not treated as temporal without a successful epoch parse).`,
            fix: {
              description: `Map a temporal field, use a working parse: { epoch: "ms" | "s" }, or remove temporal color options.`,
            },
          });
          continue;
        }
        if (
          config?.temporalKind !== undefined &&
          decision?.kind !== null &&
          decision?.kind !== undefined &&
          decision.kind !== config.temporalKind
        ) {
          errors.push({
            code: "scale-type-mismatch",
            path: use.path,
            message: `scales.${channel} requests temporal kind "${config.temporalKind}" but field "${use.field}" parses as "${decision.kind}".`,
            fix: {
              description: `Use the ${decision.kind ?? "matching"} color helper or correct the source precision.`,
            },
          });
          continue;
        }
      }

      if (type !== "nominal" && type !== "ordinal") continue;

      // Same schema-invalid-parser guard as the quantitative branch above: a
      // malformed parser would throw in temporalDecisionForField below.
      if (requestsTemporal && !temporalParserUsable(config?.parse)) continue;

      if (!requestsTemporal) {
        errors.push({
          code: "scale-type-mismatch",
          path: use.path,
          message: inferredFromSequentialScheme
            ? `scales.${channel}.scheme is "${config.scheme}" and selects a sequential scale, but field "${use.field}" is ${type}; sequential color ramps need quantitative values.`
            : `scales.${channel}.type is "${effectiveType}" but field "${use.field}" is ${type}; quantitative color scales need quantitative or temporal values.`,
          fix: inferredFromSequentialScheme
            ? {
                description: `Set scales.${channel}.scheme to a categorical scheme, remove it to infer an ordinal scale from "${use.field}", or map a quantitative field.`,
                example: { scheme: "observable10" },
              }
            : { description: `Set scales.${channel}.type to "ordinal".` },
        });
        continue;
      }

      const info = fields.get(use.field);
      const decision = temporalDecisionForField(
        temporalDecisionCache,
        use.field,
        info,
        config?.parse ?? "auto",
        {
          ...(config?.timezone !== undefined && { timezone: config.timezone }),
          ...(config?.disambiguation !== undefined && {
            disambiguation: config.disambiguation,
          }),
        },
      );
      const censoredInvalid = censoredTemporalColorRecovers({
        config,
        decision,
        field: use.field,
        recovery,
      });
      if (decision?.status === "temporal" || censoredInvalid) {
        // Mirror runtime: compare recovered kind even when status is invalid+censored.
        if (
          config?.temporalKind !== undefined &&
          decision?.kind !== null &&
          decision?.kind !== undefined &&
          decision.kind !== config.temporalKind
        ) {
          errors.push({
            code: "scale-type-mismatch",
            path: use.path,
            message: `scales.${channel} requests temporal kind "${config.temporalKind}" but field "${use.field}" parses as "${decision.kind}".`,
            fix: {
              description: `Use the ${decision.kind ?? "matching"} color helper or correct the source precision.`,
            },
          });
        }
        continue;
      }

      const detail =
        decision?.status === "ambiguous"
          ? ` Automatic temporal inference was ambiguous between: ${decision.candidates.join(", ")}.`
          : decision?.status === "invalid"
            ? ` Temporal parsing rejected ${String(decision.failedCount)} value(s).`
            : "";
      errors.push({
        code: "scale-type-mismatch",
        path: use.path,
        message: `scales.${channel} requests temporal colors but field "${use.field}" is ${type}.${detail}`,
        fix: {
          description:
            config?.parse === undefined
              ? `Set scales.${channel}.parse to the exact temporal order, or use type: "ordinal".`
              : `Correct the rejected values, choose the matching parser, or set parseFailure: "censor" explicitly.`,
        },
      });
    }
  }
  return errors;
}
