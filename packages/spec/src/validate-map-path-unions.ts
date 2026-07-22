/**
 * anyOf/const union path mapping for TypeBox 1.x errors (channel forms, data
 * refs, enums). Keyword handlers: validate-map-path-keywords.ts.
 * Orchestrator: validate-map-errors.ts.
 *
 * Result contract:
 *  - `{ status: "done", errors }` — including `errors: []` meaning "suppress
 *    noisy union diagnostics; a nested path owns the real error"
 *  - `{ status: "continue", activeFormKeys }` — fall through to keyword handlers
 *    (activeFormKeys null when no near-canonical form keyed the fall-through)
 */
import type { TLocalizedValidationError } from "typebox/error";

import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import {
  isRecord,
  schemaAtInstancePath,
  schemaAtSchemaPath,
  unionMembers,
} from "./validate-schema-walk.js";
import {
  allowedKeysForPresentChannelForm,
  allowedKeysForPresentDataForm,
  channelDiscriminatorKeys,
  CHANNEL_FIX_EXAMPLE,
  dataDiscriminatorKeys,
  dataDiscriminatorsForUnion,
  hasActionableAddlNoise,
  isChannelPath,
  isDataUnionPath,
  isScalarValue,
  looksLikeChannelForm,
  looksLikeDataContainer,
} from "./validate-map-forms.js";
import type { MapErrorsContext } from "./validate-map-errors.js";

export type UnionPathResult =
  | { status: "done"; errors: SpecError[] }
  | { status: "continue"; activeFormKeys: ReadonlySet<string> | null };

/**
 * Classify anyOf/const group noise. When neither anyOf nor const is present,
 * returns continue with null form keys so keyword handlers still run.
 */
export function mapUnionPathGroup(
  instancePath: string,
  group: readonly TLocalizedValidationError[],
  ctx: MapErrorsContext,
  path: string,
  key: string,
  valueAtPath: unknown,
): UnionPathResult {
  const anyOfErr = group.find((e) => e.keyword === "anyOf");
  const constErrs = group.filter((e) => e.keyword === "const");

  if (anyOfErr === undefined && constErrs.length === 0) {
    return { status: "continue", activeFormKeys: null };
  }

  // Object-branch noise in mixed unions (e.g. ThemeName | ThemeSpec): prefer
  // required / additionalProperties over const-branch enum synthesis.
  const hasObjectBranchNoise =
    isRecord(valueAtPath) &&
    group.some((e) => e.keyword === "additionalProperties" || e.keyword === "required");

  // anyOf / const unions FIRST: 1.x fans out branch failures (required +
  // additionalProperties + anyOf) for object unions. Prefer the anyOf signal
  // so DataRef / ChannelValue surface catalog codes, not branch noise — except
  // when the instance already matches a near-canonical form (nested paths own
  // the real diagnostic) or an object branch reported concrete property noise.
  const unionSchema =
    (anyOfErr === undefined
      ? null
      : schemaAtSchemaPath(ctx.schema, instancePath, anyOfErr.schemaPath)) ??
    schemaAtInstancePath(ctx.schema, instancePath);
  const members = unionMembers(unionSchema);

  const isChannel =
    members.refs.includes("FieldRef") ||
    members.refs.some((r) => r.endsWith("FieldRef")) ||
    isChannelPath(path);

  if (isChannel && !members.allConst) {
    // Near-canonical channel object:
    // - mixed forms (field+value) → invalid-channel-value
    // - form-illegal keys (field+scale) / typos → fall through to addl
    // - nested type failures only (value: {}) → suppress union catalog
    if (
      isRecord(valueAtPath) &&
      looksLikeChannelForm(valueAtPath) &&
      typeof valueAtPath !== "string"
    ) {
      const discs = channelDiscriminatorKeys(valueAtPath);
      if (discs.length > 1) {
        return {
          status: "done",
          errors: [
            {
              code: "invalid-channel-value",
              path,
              message: `Channel "${key}" mixes forms (${discs.map((d) => `"${d}"`).join(" and ")}); use exactly one of {"field": ...}, {"value": ...}, or {"stat": ...}.`,
              fix: {
                description: `Pick a single channel form for "${key}".`,
                example: CHANNEL_FIX_EXAMPLE,
              },
            },
          ],
        };
      }
      const formKeys = allowedKeysForPresentChannelForm(valueAtPath);
      if (formKeys !== null && hasActionableAddlNoise(group, formKeys)) {
        return { status: "continue", activeFormKeys: formKeys };
      }
      // Nested path owns the diagnostic — empty done, not fall-through.
      return { status: "done", errors: [] };
    }
    const bareString = typeof valueAtPath === "string";
    return {
      status: "done",
      errors: [
        {
          code: "invalid-channel-value",
          path,
          message: bareString
            ? `Channel "${key}" is the bare string ${JSON.stringify(valueAtPath)}; portable specs require the canonical form {"field": ${JSON.stringify(valueAtPath)}}.`
            : `Channel "${key}" must be {"field": ...}, {"value": ...}, {"stat": ...}, or null.`,
          fix: {
            description: `Use a canonical channel form, e.g. {"field": "column_name"} to map "${key}" to a data column.`,
            example: bareString ? { field: valueAtPath } : CHANNEL_FIX_EXAMPLE,
          },
        },
      ],
    };
  }

  const isDataUnion =
    members.refs.includes("DataValues") ||
    members.refs.some((r) => r.includes("DataValues")) ||
    (isDataUnionPath(path) && anyOfErr !== undefined);

  if (isDataUnion) {
    const allowedDataDiscriminators = dataDiscriminatorsForUnion(members, path);
    const allowedDataForms = allowedDataDiscriminators.map((discriminator) =>
      discriminator === "values"
        ? '{"values": [...rows]}'
        : discriminator === "columns"
          ? '{"columns": {...arrays}}'
          : '{"name": "dataset"}',
    );
    const allowedDataFormsMessage =
      allowedDataForms.length === 2
        ? `${allowedDataForms[0]} or ${allowedDataForms[1]}`
        : `${allowedDataForms.slice(0, -1).join(", ")}, or ${allowedDataForms.at(-1)}`;
    // Already wrapped as an allowed data form:
    // - mixed allowed forms (values+name on DataRef) → invalid-data
    // - illegal discriminators / extra siblings → fall through for unexpected-property
    // - nested cell failures only → suppress invalid-data re-wrap
    if (isRecord(valueAtPath) && looksLikeDataContainer(valueAtPath)) {
      const discs = dataDiscriminatorKeys(valueAtPath, allowedDataDiscriminators);
      if (discs.length > 1) {
        return {
          status: "done",
          errors: [
            {
              code: "invalid-data",
              path,
              message: `Data mixes forms (${discs.map((d) => `"${d}"`).join(" and ")}); use exactly one of ${allowedDataFormsMessage}.`,
              allowed: [...allowedDataDiscriminators],
              fix: {
                description: "Pick a single data form.",
                example: { values: [{ x: 1, y: 2 }] },
              },
            },
          ],
        };
      }
      const presentFormKeys = allowedKeysForPresentDataForm(valueAtPath, allowedDataDiscriminators);
      const formKeys = presentFormKeys ?? new Set(allowedDataDiscriminators);
      if (hasActionableAddlNoise(group, formKeys)) {
        return { status: "continue", activeFormKeys: formKeys };
      }
      // Nested path owns the diagnostic — empty done, not fall-through.
      return { status: "done", errors: [] };
    }
    return {
      status: "done",
      errors: [
        {
          code: "invalid-data",
          path,
          message: `Data must be one of ${allowedDataFormsMessage}.`,
          allowed: [...allowedDataDiscriminators],
          fix: {
            description: 'Wrap inline rows as {"values": [...]}.',
            example: { values: [{ x: 1, y: 2 }] },
          },
        },
      ],
    };
  }

  // Prefer allowed values from the actual const errors TypeBox emitted —
  // schemaPath resolution against Cyclic $defs can land on the wrong
  // sibling union (e.g. scale type vs coord type both use `properties/type`).
  let allowed: string[] = [];
  if (constErrs.length > 0) {
    allowed = constErrs
      .map((e) => (e.params as { allowedValue?: unknown }).allowedValue)
      .filter((v) => v !== undefined)
      .map(String);
  }
  if (allowed.length === 0 && members.allConst && members.consts.length > 0) {
    allowed = members.consts;
  }
  // Only promote const branch noise when the value could be an enum member.
  // Mixed enum|object unions (theme) must not turn ThemeSpec property errors
  // into "pick a theme name".
  if (
    allowed.length > 0 &&
    (members.allConst || isScalarValue(valueAtPath)) &&
    !hasObjectBranchNoise
  ) {
    if (allowed.length === 1 && constErrs.length <= 1 && anyOfErr === undefined) {
      return {
        status: "done",
        errors: [
          {
            code: "invalid-enum-value",
            path,
            message: `Invalid value ${JSON.stringify(valueAtPath)} for "${key}"; the only supported value is ${allowed.map((a) => `"${a}"`).join(", ")}.`,
            allowed,
          },
        ],
      };
    }
    const suggestion =
      typeof valueAtPath === "string" ? didYouMean(valueAtPath, allowed) : undefined;
    return {
      status: "done",
      errors: [
        {
          code: "invalid-enum-value",
          path,
          message:
            `Invalid value ${JSON.stringify(valueAtPath)} for "${key}"; allowed: ${allowed.map((c) => `"${c}"`).join(", ")}.` +
            (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
          allowed,
          ...(suggestion !== undefined && {
            fix: { description: `Set "${key}" to "${suggestion}".` },
          }),
        },
      ],
    };
  }

  if (anyOfErr !== undefined && !hasObjectBranchNoise) {
    return {
      status: "done",
      errors: [
        {
          code: "invalid-type",
          path,
          message: `${anyOfErr.message} at "${key}".`,
        },
      ],
    };
  }
  // Mixed union with object-branch property noise: fall through to
  // additionalProperties / required handlers below.
  return { status: "continue", activeFormKeys: null };
}
