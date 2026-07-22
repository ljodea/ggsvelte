/**
 * TypeBox 1.x validation errors → agent SpecError mapping (tier-1).
 *
 * TypeBox 1.x (`typebox`) reports JSON-Schema-style errors (`keyword`,
 * `instancePath`, `params`) rather than 0.x `ValueErrorType` + embedded
 * schema/value. Discriminator-aware union classification (channel forms,
 * data refs, const enums) is reconstructed from keywords + schema lookup
 * against the Cyclic root being validated.
 *
 * Schema / path inspection: validate-schema-walk.ts.
 * Channel/data form classification: validate-map-forms.ts.
 * Union path mapping: validate-map-path-unions.ts.
 * Keyword path mapping: validate-map-path-keywords.ts.
 * Used only by validate() — not part of the package public surface.
 */
import type { TLocalizedValidationError } from "typebox/error";

import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import { KNOWN_GEOMS } from "./schema.js";
import { lastSegment, pointerGet } from "./validate-schema-walk.js";
import { mapKeywordPathGroup } from "./validate-map-path-keywords.js";
import { mapUnionPathGroup } from "./validate-map-path-unions.js";

export interface MapErrorsContext {
  /** Schema root passed to Value.Errors (Cyclic `$defs`+`$ref`). */
  schema: unknown;
  /** Value that was validated (for reading failing values via instancePath). */
  value: unknown;
  /** Path prefix prepended to each instancePath (e.g. `/layers/0`). */
  pathPrefix: string;
}

/**
 * Map a batch of TypeBox 1.x validation errors into agent SpecErrors.
 * Groups const/anyOf noise so enum and channel unions surface as one error.
 */
export function mapValueErrors(
  rawErrors: readonly TLocalizedValidationError[],
  ctx: MapErrorsContext,
): SpecError[] {
  if (rawErrors.length === 0) return [];

  // Group by instancePath so multi-const anyOf enums collapse.
  const byPath = new Map<string, TLocalizedValidationError[]>();
  for (const err of rawErrors) {
    const list = byPath.get(err.instancePath) ?? [];
    list.push(err);
    byPath.set(err.instancePath, list);
  }

  const out: SpecError[] = [];
  for (const [instancePath, group] of byPath) {
    out.push(...mapPathGroup(instancePath, group, ctx));
  }
  return out;
}

function mapPathGroup(
  instancePath: string,
  group: readonly TLocalizedValidationError[],
  ctx: MapErrorsContext,
): SpecError[] {
  const path = ctx.pathPrefix + instancePath;
  const key = lastSegment(instancePath);
  const valueAtPath = pointerGet(ctx.value, instancePath);

  if (
    group.some((error) => error.keyword === "pattern") &&
    /^\/scales\/(?:color|fill)\/range\/\d+$/.test(path) &&
    typeof valueAtPath === "string"
  ) {
    return [
      {
        code: "scale-range-color",
        path,
        message: `The color stop "${valueAtPath}" is not a supported hex color.`,
        fix: {
          description: "Use #rgb or #rrggbb syntax for custom color ranges.",
          example: "#ff0000",
        },
      },
    ];
  }

  const union = mapUnionPathGroup(instancePath, group, ctx, path, key, valueAtPath);
  if (union.status === "done") return union.errors;

  return mapKeywordPathGroup(
    instancePath,
    group,
    ctx,
    path,
    key,
    valueAtPath,
    union.activeFormKeys,
  );
}

export function unknownGeomError(geom: unknown, layerPath: string): SpecError {
  const allowed = [...KNOWN_GEOMS];
  if (typeof geom !== "string") {
    return {
      code: "missing-geom",
      path: `${layerPath}/geom`,
      message: `Every layer needs a "geom" discriminator. Allowed geoms: ${allowed.map((g) => `"${g}"`).join(", ")}.`,
      allowed,
      fix: {
        description: "Add a geom to the layer.",
        example: { geom: "point" },
      },
    };
  }
  const suggestion = didYouMean(geom, allowed);
  return {
    code: "unknown-geom",
    path: `${layerPath}/geom`,
    message:
      `Unknown geom "${geom}". Allowed geoms: ${allowed.map((g) => `"${g}"`).join(", ")}.` +
      (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
    allowed,
    ...(suggestion !== undefined && {
      fix: { description: `Set geom to "${suggestion}".`, example: { geom: suggestion } },
    }),
  };
}
