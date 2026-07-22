/**
 * Keyword path mapping for TypeBox 1.x errors: additionalProperties, required,
 * numeric range, and default type normalization.
 * Union classification: validate-map-path-unions.ts. Orchestrator: validate-map-errors.ts.
 */
import type { TLocalizedValidationError } from "typebox/error";

import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import {
  additionalPropertiesIsClosed,
  numberBounds,
  objectPropertyNames,
  pointerGet,
  schemaAtInstancePath,
  schemaAtSchemaPath,
} from "./validate-schema-walk.js";
import { additionalPropertyNames } from "./validate-map-forms.js";
import type { MapErrorsContext } from "./validate-map-errors.js";

/** Map remaining keywords after union classification (or when no anyOf/const). */
export function mapKeywordPathGroup(
  instancePath: string,
  group: readonly TLocalizedValidationError[],
  ctx: MapErrorsContext,
  path: string,
  key: string,
  valueAtPath: unknown,
  activeFormKeys: ReadonlySet<string> | null,
): SpecError[] {
  // additionalProperties: closed objects → unexpected keys; schema-valued
  // additionalProperties (records / free-form rows) → value type failures.
  const addl = group.find((e) => e.keyword === "additionalProperties");
  if (addl !== undefined) {
    const listed = additionalPropertyNames(group, activeFormKeys ?? new Set());
    const objectSchema =
      (typeof addl.schemaPath === "string"
        ? schemaAtSchemaPath(ctx.schema, instancePath, addl.schemaPath)
        : null) ?? schemaAtInstancePath(ctx.schema, instancePath);
    if (!additionalPropertiesIsClosed(objectSchema)) {
      return listed.map((prop) => {
        const propPath = `${path}/${prop}`;
        const propValue = pointerGet(ctx.value, `${instancePath}/${prop}`);
        return {
          code: "invalid-type" as const,
          path: propPath,
          message: `Invalid value for "${prop}" (got ${JSON.stringify(propValue)}).`,
        };
      });
    }
    const properties =
      activeFormKeys === null ? objectPropertyNames(objectSchema) : [...activeFormKeys];
    return listed.map((prop) => {
      const propPath = `${path}/${prop}`;
      const suggestion = didYouMean(prop, properties);
      return {
        code: "unexpected-property" as const,
        path: propPath,
        message:
          `Unknown property "${prop}".` +
          (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
        allowed: properties,
        ...(suggestion !== undefined && {
          fix: { description: `Rename "${prop}" to "${suggestion}".` },
        }),
      };
    });
  }

  // required: may list several missing keys.
  const req = group.find((e) => e.keyword === "required");
  if (req !== undefined) {
    const missing = Array.isArray(req.params.requiredProperties)
      ? req.params.requiredProperties
      : [];
    return missing.map((prop) => ({
      code: "missing-property" as const,
      path: `${path}/${prop}`,
      message: `Missing required property "${prop}".`,
    }));
  }

  // numeric range — use schema bounds when available for full min+max message.
  const rangeErr = group.find((e) =>
    ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum"].includes(e.keyword),
  );
  if (rangeErr !== undefined) {
    const propSchema =
      schemaAtInstancePath(ctx.schema, instancePath) ??
      schemaAtSchemaPath(ctx.schema, instancePath, rangeErr.schemaPath);
    let bounds = numberBounds(propSchema);
    if (bounds.length === 0) {
      const limit = (rangeErr.params as { limit?: number }).limit;
      const comparison = (rangeErr.params as { comparison?: string }).comparison;
      if (typeof limit === "number" && typeof comparison === "string") {
        bounds = [`${comparison} ${limit}`];
      }
    }
    return [
      {
        code: "value-out-of-range",
        path,
        message: `Value ${JSON.stringify(valueAtPath)} for "${key}" is out of range (must be ${bounds.join(" and ")}).`,
        fix: { description: `Set "${key}" to a number ${bounds.join(" and ")}.` },
      },
    ];
  }

  // Lone const (Literal) without anyOf group — handled in union module when
  // constErrs non-empty; fall through to default for remaining keywords (type, etc.).

  // Normalize 1.x "must be X" wording toward the catalog's "Expected X" form.
  const first = group[0]!;
  let message = first.message;
  if (first.keyword === "type") {
    const t = (first.params as { type?: string | string[] }).type;
    const expected = Array.isArray(t) ? t.join("|") : t;
    if (typeof expected === "string") {
      message = `Expected ${expected}`;
    }
  }
  return [
    {
      code: "invalid-type",
      path,
      message: `${message}${path === "" ? "" : ` at "${key}"`} (got ${JSON.stringify(valueAtPath)}).`,
    },
  ];
}
