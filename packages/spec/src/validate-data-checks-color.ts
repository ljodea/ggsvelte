/**
 * Color/fill data-aware scale checks (manual domain/range, sequential, temporal).
 * Shared temporal memoization: validate-data-checks-temporal.ts.
 * Position: validate-data-checks-position.ts. Orchestrator: validate-data-checks.ts.
 */
import type { SpecError } from "./errors.js";
import { configuredColorScaleType } from "./scale-helpers.js";
import type { ColorScaleSpec } from "./schema.js";
import { SEQUENTIAL_SCHEME_NAMES } from "./schema.js";
import type { FieldEvidenceMap } from "./validate-data-evidence.js";
import {
  temporalDecisionForField,
  type ChannelFieldUse,
  type TemporalDecisionCache,
} from "./validate-data-checks-temporal.js";

const COLOR_CHANNELS = ["color", "fill"] as const;
const SEQUENTIAL_SCHEMES = new Set<string>(SEQUENTIAL_SCHEME_NAMES);

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

function expectedManualDomainLength(
  domain: unknown,
  fieldValueLists: readonly (readonly unknown[] | null | undefined)[],
): number | null {
  if (Array.isArray(domain)) return domain.filter((value) => value !== null).length;
  const seen = new Set<string>();
  let sawValues = false;
  for (const values of fieldValueLists) {
    if (values === null || values === undefined) continue;
    sawValues = true;
    for (const value of values) {
      if (value === null) continue;
      seen.add(discreteDomainKey(value));
    }
  }
  return sawValues ? seen.size : null;
}

/** Post-layer color/fill scale type compatibility against collected field uses. */
export function checkColorScaleDataCompatibility(input: {
  scales: Record<string, unknown> | undefined;
  fields: FieldEvidenceMap;
  colorFields: Record<"color" | "fill", ChannelFieldUse[]>;
  temporalDecisionCache: TemporalDecisionCache;
}): SpecError[] {
  const { scales, fields, colorFields, temporalDecisionCache } = input;
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
      );
      if (expected !== null && range.length !== expected) {
        errors.push({
          code: "scale-manual-domain-range",
          path: `/scales/${channel}`,
          message: `The manual ${channel} scale needs one range color per domain value (${String(expected)} values, ${String(range.length)} colors).`,
          fix: {
            description: `Provide ${String(expected)} range colors, or set scales.${channel}.domain explicitly to match the range length.`,
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

      const requestsTemporal =
        config?.temporalKind !== undefined ||
        config?.parse !== undefined ||
        config?.timezone !== undefined ||
        config?.disambiguation !== undefined;

      // Quantitative fields with temporal-only options fail at resolve time.
      if (type === "quantitative" && requestsTemporal) {
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
        if (decision?.status !== "temporal") {
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
          decision.kind !== null &&
          decision.kind !== undefined &&
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
      const censoredInvalid =
        config?.parse !== undefined &&
        config.parseFailure === "censor" &&
        decision?.status === "invalid";
      if (decision?.status === "temporal" || censoredInvalid) {
        if (
          decision?.status === "temporal" &&
          config?.temporalKind !== undefined &&
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
