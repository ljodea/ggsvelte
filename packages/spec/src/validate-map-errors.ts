/**
 * TypeBox ValueError → agent SpecError mapping (tier-1 schema walk).
 *
 * Discriminator-aware union classification: channel forms, data refs, and
 * const enums get catalog codes with concrete fixes instead of raw union noise.
 * Used only by validate() — not part of the package public surface.
 */
import type { ValueError } from "@sinclair/typebox/errors";
import { ValueErrorType } from "@sinclair/typebox/errors";

import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import { KNOWN_GEOMS } from "./schema.js";

const CHANNEL_FIX_EXAMPLE = { field: "column_name" };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function lastSegment(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

interface UnionMemberInfo {
  refs: string[];
  consts: string[];
  allConst: boolean;
}

function unionMembers(schema: unknown): UnionMemberInfo {
  const info: UnionMemberInfo = { refs: [], consts: [], allConst: true };
  const anyOf =
    isRecord(schema) && Array.isArray(schema["anyOf"]) ? (schema["anyOf"] as unknown[]) : [];
  for (const member of anyOf) {
    if (!isRecord(member)) continue;
    const ref = member["$ref"];
    if (typeof ref === "string") info.refs.push(ref);
    const c = member["const"];
    if (typeof c === "string" || typeof c === "number" || typeof c === "boolean") {
      info.consts.push(String(c));
    } else {
      info.allConst = false;
    }
  }
  if (anyOf.length === 0) info.allConst = false;
  return info;
}

/** Map one TypeBox ValueError into the agent error contract. */
export function mapValueError(error: ValueError, pathPrefix: string): SpecError {
  const path = pathPrefix + error.path;
  const key = lastSegment(error.path);

  switch (error.type) {
    case ValueErrorType.ObjectAdditionalProperties: {
      const properties =
        isRecord(error.schema) && isRecord(error.schema["properties"])
          ? Object.keys(error.schema["properties"])
          : [];
      const suggestion = didYouMean(key, properties);
      return {
        code: "unexpected-property",
        path,
        message:
          `Unknown property "${key}".` +
          (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
        allowed: properties,
        ...(suggestion !== undefined && {
          fix: { description: `Rename "${key}" to "${suggestion}".` },
        }),
      };
    }
    case ValueErrorType.ObjectRequiredProperty:
      return {
        code: "missing-property",
        path,
        message: `Missing required property "${key}".`,
      };
    case ValueErrorType.NumberMinimum:
    case ValueErrorType.NumberMaximum:
    case ValueErrorType.NumberExclusiveMinimum:
    case ValueErrorType.NumberExclusiveMaximum: {
      const s: Record<string, unknown> = isRecord(error.schema) ? error.schema : {};
      const bounds: string[] = [];
      if (typeof s["minimum"] === "number") bounds.push(`>= ${s["minimum"]}`);
      if (typeof s["exclusiveMinimum"] === "number") bounds.push(`> ${s["exclusiveMinimum"]}`);
      if (typeof s["maximum"] === "number") bounds.push(`<= ${s["maximum"]}`);
      if (typeof s["exclusiveMaximum"] === "number") bounds.push(`< ${s["exclusiveMaximum"]}`);
      return {
        code: "value-out-of-range",
        path,
        message: `Value ${JSON.stringify(error.value)} for "${key}" is out of range (must be ${bounds.join(" and ")}).`,
        fix: { description: `Set "${key}" to a number ${bounds.join(" and ")}.` },
      };
    }
    case ValueErrorType.Literal: {
      const allowed =
        isRecord(error.schema) && error.schema["const"] !== undefined
          ? [String(error.schema["const"])]
          : [];
      return {
        code: "invalid-enum-value",
        path,
        message: `Invalid value ${JSON.stringify(error.value)} for "${key}"; the only supported value is ${allowed.map((a) => `"${a}"`).join(", ")}.`,
        allowed,
      };
    }
    case ValueErrorType.Union: {
      const members = unionMembers(error.schema);
      if (members.refs.includes("FieldRef")) {
        const bareString = typeof error.value === "string";
        return {
          code: "invalid-channel-value",
          path,
          message: bareString
            ? `Channel "${key}" is the bare string ${JSON.stringify(error.value)}; portable specs require the canonical form {"field": ${JSON.stringify(error.value)}}.`
            : `Channel "${key}" must be {"field": ...}, {"value": ...}, {"stat": ...}, or null.`,
          fix: {
            description: `Use a canonical channel form, e.g. {"field": "column_name"} to map "${key}" to a data column.`,
            example: bareString ? { field: error.value as string } : CHANNEL_FIX_EXAMPLE,
          },
        };
      }
      if (members.refs.includes("DataValues")) {
        return {
          code: "invalid-data",
          path,
          message: `Data must be one of {"values": [...rows]}, {"columns": {...arrays}}, or {"name": "dataset"}.`,
          allowed: ["values", "columns", "name"],
          fix: {
            description: 'Wrap inline rows as {"values": [...]}.',
            example: { values: [{ x: 1, y: 2 }] },
          },
        };
      }
      if (members.allConst) {
        const suggestion =
          typeof error.value === "string" ? didYouMean(error.value, members.consts) : undefined;
        return {
          code: "invalid-enum-value",
          path,
          message:
            `Invalid value ${JSON.stringify(error.value)} for "${key}"; allowed: ${members.consts.map((c) => `"${c}"`).join(", ")}.` +
            (suggestion === undefined ? "" : ` Did you mean "${suggestion}"?`),
          allowed: members.consts,
          ...(suggestion !== undefined && {
            fix: { description: `Set "${key}" to "${suggestion}".` },
          }),
        };
      }
      return {
        code: "invalid-type",
        path,
        message: `${error.message} at "${key}".`,
      };
    }
    default:
      return {
        code: "invalid-type",
        path,
        message: `${error.message}${path === "" ? "" : ` at "${key}"`} (got ${JSON.stringify(error.value)}).`,
      };
  }
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
