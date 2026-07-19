/**
 * TypeBox 1.x validation errors → agent SpecError mapping (tier-1 schema walk).
 *
 * TypeBox 1.x (`typebox`) reports JSON-Schema-style errors (`keyword`,
 * `instancePath`, `params`) rather than 0.x `ValueErrorType` + embedded
 * schema/value. Discriminator-aware union classification (channel forms,
 * data refs, const enums) is reconstructed from keywords + schema lookup
 * against the Cyclic root being validated.
 *
 * Used only by validate() — not part of the package public surface.
 */
import type { TLocalizedValidationError } from "typebox/error";

import type { SpecError } from "./errors.js";
import { didYouMean } from "./errors.js";
import { KNOWN_GEOMS } from "./schema.js";

const CHANNEL_FIX_EXAMPLE = { field: "column_name" };

/** Channel names that live under aes (plot- or layer-level). */
const AES_CHANNEL_KEYS = new Set([
  "x",
  "y",
  "color",
  "fill",
  "size",
  "linewidth",
  "alpha",
  "group",
  "label",
  "weight",
  "ymin",
  "ymax",
]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function lastSegment(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

function pathSegments(path: string): string[] {
  return path.split("/").filter((s) => s.length > 0);
}

/** JSON-pointer get (instancePath form: `/a/b/0`). */
function pointerGet(root: unknown, path: string): unknown {
  if (path === "" || path === "/") return root;
  let cur: unknown = root;
  for (const seg of pathSegments(path)) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const i = Number(seg);
      cur = Number.isInteger(i) ? cur[i] : undefined;
      continue;
    }
    if (!isRecord(cur)) return undefined;
    cur = cur[seg];
  }
  return cur;
}

/** Resolve the root object schema of a TypeBox Cyclic (`$defs` + `$ref`). */
function cyclicRootSchema(schema: unknown): Record<string, unknown> | null {
  if (!isRecord(schema)) return null;
  const defs = schema["$defs"];
  const ref = schema["$ref"];
  if (isRecord(defs) && typeof ref === "string" && isRecord(defs[ref])) {
    return defs[ref];
  }
  return isRecord(schema) ? schema : null;
}

function resolveRef(
  node: Record<string, unknown>,
  defs: Record<string, unknown> | null,
): Record<string, unknown> {
  const ref = node["$ref"];
  if (typeof ref !== "string" || defs === null) return node;
  // TypeBox emits bare names ("PointParams") and sometimes JSON pointers.
  const name = ref.startsWith("#/$defs/")
    ? ref.slice("#/$defs/".length)
    : ref.startsWith("#/")
      ? null
      : ref;
  if (name !== null && isRecord(defs[name])) return defs[name];
  return node;
}

/**
 * Walk a Cyclic schema along an instance path, returning the schema that
 * describes the value at that path (after following $refs).
 */
function schemaAtInstancePath(rootSchema: unknown, instancePath: string): unknown {
  const root = cyclicRootSchema(rootSchema);
  if (root === null) return null;
  const defs = isRecord(rootSchema) && isRecord(rootSchema["$defs"]) ? rootSchema["$defs"] : null;
  let node: Record<string, unknown> = root;
  for (const seg of pathSegments(instancePath)) {
    node = resolveRef(node, defs);
    const props = node["properties"];
    if (isRecord(props) && isRecord(props[seg])) {
      node = props[seg];
      continue;
    }
    // Array index: follow `items` (object or tuple entry).
    if (/^\d+$/.test(seg)) {
      const items = node["items"];
      if (isRecord(items)) {
        node = items;
        continue;
      }
      if (Array.isArray(items)) {
        const entry: unknown = items[Number(seg)];
        if (isRecord(entry)) {
          node = entry;
          continue;
        }
      }
    }
    // additionalProperties / patternProperties value schemas
    if (isRecord(node["additionalProperties"])) {
      node = node["additionalProperties"];
      continue;
    }
    return null;
  }
  return resolveRef(node, defs);
}

/**
 * Resolve a TypeBox-relative schemaPath (`#/properties/x/anyOf/0`) against
 * the schema that applies at `instancePath`'s parent object context.
 * For Cyclic validation, `#` is relative to the nearest $ref target; we
 * approximate by resolving at the instancePath node, then walking the path.
 */
function schemaAtSchemaPath(
  rootSchema: unknown,
  instancePath: string,
  schemaPath: string,
): unknown {
  // Most useful cases: `#` means the schema of the instance node itself
  // (e.g. additionalProperties on PointParams when instancePath is /params).
  const base = schemaAtInstancePath(rootSchema, instancePath);
  if (schemaPath === "#" || schemaPath === "") return base;

  const defs = isRecord(rootSchema) && isRecord(rootSchema["$defs"]) ? rootSchema["$defs"] : null;

  const parts = schemaPath
    .replace(/^#\/?/, "")
    .split("/")
    .filter((p) => p.length > 0);
  // If walking from base fails, fall back to walking from cyclic root def.
  const tryWalk = (start: unknown): unknown => {
    let cur = start;
    for (const p of parts) {
      if (cur === null || cur === undefined) return null;
      if (Array.isArray(cur) && /^\d+$/.test(p)) {
        cur = cur[Number(p)];
        continue;
      }
      if (!isRecord(cur)) return null;
      const rec = resolveRef(cur, defs);
      cur = rec[p];
    }
    return isRecord(cur) ? resolveRef(cur, defs) : cur;
  };

  const fromBase = tryWalk(base);
  if (fromBase !== null && fromBase !== undefined) return fromBase;
  const fromRoot = tryWalk(cyclicRootSchema(rootSchema));
  if (fromRoot !== null && fromRoot !== undefined) return fromRoot;
  // TypeBox 1 schemaPath is often relative to a $defs member (e.g. DataValues),
  // not the Cyclic plot root — try each def as a base.
  if (defs !== null) {
    for (const def of Object.values(defs)) {
      if (!isRecord(def)) continue;
      const hit = tryWalk(def);
      if (hit !== null && hit !== undefined) return hit;
    }
  }
  return null;
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
    if (typeof ref === "string") info.refs.push(ref.replace(/^#\/\$defs\//, ""));
    const c = member["const"];
    if (typeof c === "string" || typeof c === "number" || typeof c === "boolean") {
      info.consts.push(String(c));
    } else {
      // nested anyOf of literals still counts as all-const if every branch is const
      if (Array.isArray(member["anyOf"])) {
        const nested = unionMembers(member);
        if (nested.allConst && nested.consts.length > 0) {
          info.consts.push(...nested.consts);
          continue;
        }
      }
      info.allConst = false;
    }
  }
  if (anyOf.length === 0) info.allConst = false;
  return info;
}

/** True only for the channel node itself (`…/aes/<channel>`), not nested paths. */
function isChannelPath(path: string): boolean {
  const segs = pathSegments(path);
  if (segs.length < 2) return false;
  const i = segs.length - 2;
  return segs[i] === "aes" && AES_CHANNEL_KEYS.has(segs[i + 1]!);
}

/**
 * DataRef / InlineData union roots only: `/data` or `/datasets/<name>`.
 * Nested paths under a data container must keep their own diagnostics.
 */
function isDataUnionPath(path: string): boolean {
  const segs = pathSegments(path);
  if (segs.length === 1 && segs[0] === "data") return true;
  if (segs.length === 2 && segs[0] === "datasets") return true;
  return false;
}

/** Canonical channel object form (or null); bare strings are handled separately. */
function looksLikeChannelForm(v: unknown): boolean {
  if (v === null) return true;
  if (!isRecord(v)) return false;
  return "field" in v || "value" in v || "stat" in v;
}

/** Already a data container shape — do not suggest re-wrapping as `{ values: [...] }`. */
function looksLikeDataContainer(v: unknown): boolean {
  if (!isRecord(v)) return false;
  return "values" in v || "columns" in v || "name" in v;
}

function isScalarValue(v: unknown): boolean {
  return v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean";
}

/** Exclusive channel form discriminators (exactly one allowed per channel). */
const CHANNEL_DISCRIMINATORS = ["field", "value", "stat"] as const;
/** Exclusive data form discriminators (exactly one allowed per DataRef). */
const DATA_DISCRIMINATORS = ["values", "columns", "name"] as const;

/**
 * True when an additionalProperties failure lists a key that is *not* in
 * `ignoreKeys`. Used to ignore competing-branch noise (e.g. Columns rejecting
 * `values`) while still surfacing typos and form-illegal keys.
 */
function additionalPropertyNames(
  group: readonly TLocalizedValidationError[],
  ignoreKeys: ReadonlySet<string> = new Set(),
): string[] {
  const names = new Set<string>();
  for (const error of group) {
    if (error.keyword !== "additionalProperties") continue;
    const listed = Array.isArray(error.params.additionalProperties)
      ? error.params.additionalProperties
      : [];
    for (const key of listed) {
      if (!ignoreKeys.has(key)) names.add(key);
    }
  }
  return [...names];
}

function hasActionableAddlNoise(
  group: readonly TLocalizedValidationError[],
  ignoreKeys: ReadonlySet<string>,
): boolean {
  return additionalPropertyNames(group, ignoreKeys).length > 0;
}

function channelDiscriminatorKeys(v: Record<string, unknown>): string[] {
  return CHANNEL_DISCRIMINATORS.filter((k) => k in v);
}

function dataDiscriminatorKeys(
  v: Record<string, unknown>,
  allowed: readonly (typeof DATA_DISCRIMINATORS)[number][] = DATA_DISCRIMINATORS,
): string[] {
  return allowed.filter((k) => k in v);
}

function dataDiscriminatorsForUnion(
  members: UnionMemberInfo,
  path: string,
): readonly (typeof DATA_DISCRIMINATORS)[number][] {
  const allowed: (typeof DATA_DISCRIMINATORS)[number][] = [];
  if (members.refs.some((ref) => ref.endsWith("DataValues"))) allowed.push("values");
  if (members.refs.some((ref) => ref.endsWith("DataColumns"))) allowed.push("columns");
  if (members.refs.some((ref) => ref.endsWith("DataName"))) allowed.push("name");
  if (allowed.length > 0) return allowed;
  return pathSegments(path)[0] === "datasets" ? ["values", "columns"] : DATA_DISCRIMINATORS;
}

/**
 * Keys legal on the single present channel form, or null when forms are mixed
 * / absent. FieldRef = {field}; ValueRef = {value, scale?}; StatRef = {stat}.
 */
function allowedKeysForPresentChannelForm(v: Record<string, unknown>): Set<string> | null {
  const discs = channelDiscriminatorKeys(v);
  if (discs.length !== 1) return null;
  switch (discs[0]) {
    case "field":
      return new Set(["field"]);
    case "value":
      return new Set(["value", "scale"]);
    case "stat":
      return new Set(["stat"]);
    default:
      return null;
  }
}

/** Keys legal on the single present data form, or null when forms are mixed. */
function allowedKeysForPresentDataForm(
  v: Record<string, unknown>,
  allowedDiscriminators: readonly (typeof DATA_DISCRIMINATORS)[number][],
): Set<string> | null {
  const discs = dataDiscriminatorKeys(v, allowedDiscriminators);
  if (discs.length !== 1) return null;
  return new Set([discs[0]!]);
}

/**
 * TypeBox Object with `additionalProperties: false` (closed) vs a schema
 * (record/open keys whose *values* must match). 1.x reports value failures
 * under schema-valued additionalProperties with the same keyword.
 */
function additionalPropertiesIsClosed(objectSchema: unknown): boolean {
  if (!isRecord(objectSchema)) return true;
  const ap = objectSchema["additionalProperties"];
  // Explicit schema (object / boolean true) means keys are allowed; false/absent = closed.
  if (ap === false || ap === undefined) return true;
  if (ap === true) return false;
  return typeof ap !== "object" || ap === null;
}

function objectPropertyNames(schema: unknown): string[] {
  if (!isRecord(schema)) return [];
  const props = schema["properties"];
  return isRecord(props) ? Object.keys(props) : [];
}

function numberBounds(schema: unknown): string[] {
  if (!isRecord(schema)) return [];
  const bounds: string[] = [];
  if (typeof schema["minimum"] === "number") bounds.push(`>= ${schema["minimum"]}`);
  if (typeof schema["exclusiveMinimum"] === "number")
    bounds.push(`> ${schema["exclusiveMinimum"]}`);
  if (typeof schema["maximum"] === "number") bounds.push(`<= ${schema["maximum"]}`);
  if (typeof schema["exclusiveMaximum"] === "number")
    bounds.push(`< ${schema["exclusiveMaximum"]}`);
  return bounds;
}

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

  const anyOfErr = group.find((e) => e.keyword === "anyOf");
  const constErrs = group.filter((e) => e.keyword === "const");
  let activeFormKeys: ReadonlySet<string> | null = null;

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
  if (anyOfErr !== undefined || constErrs.length > 0) {
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
          return [
            {
              code: "invalid-channel-value",
              path,
              message: `Channel "${key}" mixes forms (${discs.map((d) => `"${d}"`).join(" and ")}); use exactly one of {"field": ...}, {"value": ...}, or {"stat": ...}.`,
              fix: {
                description: `Pick a single channel form for "${key}".`,
                example: CHANNEL_FIX_EXAMPLE,
              },
            },
          ];
        }
        const formKeys = allowedKeysForPresentChannelForm(valueAtPath);
        if (formKeys !== null && hasActionableAddlNoise(group, formKeys)) {
          activeFormKeys = formKeys;
          // fall through to additionalProperties / required handlers
        } else {
          return [];
        }
      } else {
        const bareString = typeof valueAtPath === "string";
        return [
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
        ];
      }
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
          return [
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
          ];
        }
        const presentFormKeys = allowedKeysForPresentDataForm(
          valueAtPath,
          allowedDataDiscriminators,
        );
        const formKeys = presentFormKeys ?? new Set(allowedDataDiscriminators);
        if (hasActionableAddlNoise(group, formKeys)) {
          activeFormKeys = formKeys;
          // fall through
        } else {
          return [];
        }
      } else {
        return [
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
        ];
      }
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
        return [
          {
            code: "invalid-enum-value",
            path,
            message: `Invalid value ${JSON.stringify(valueAtPath)} for "${key}"; the only supported value is ${allowed.map((a) => `"${a}"`).join(", ")}.`,
            allowed,
          },
        ];
      }
      const suggestion =
        typeof valueAtPath === "string" ? didYouMean(valueAtPath, allowed) : undefined;
      return [
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
      ];
    }

    if (anyOfErr !== undefined && !hasObjectBranchNoise) {
      return [
        {
          code: "invalid-type",
          path,
          message: `${anyOfErr.message} at "${key}".`,
        },
      ];
    }
    // Mixed union with object-branch property noise: fall through to
    // additionalProperties / required handlers below.
  }

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

  // Lone const (Literal) without anyOf group — handled above when constErrs
  // non-empty; fall through to default for remaining keywords (type, etc.).

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
