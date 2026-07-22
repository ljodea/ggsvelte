/**
 * TypeBox Cyclic schema / instance-path inspection helpers for tier-1 error mapping.
 *
 * JSON-pointer reads against the validated value, `$defs`/`$ref` walking along
 * instancePath and schemaPath, union-member inspection, and small schema-shape
 * queries. Used only by validate-map-errors.ts — not public package surface.
 */

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function lastSegment(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? path : path.slice(i + 1);
}

export function pathSegments(path: string): string[] {
  return path.split("/").filter((s) => s.length > 0);
}

/** JSON-pointer get (instancePath form: `/a/b/0`). */
export function pointerGet(root: unknown, path: string): unknown {
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
export function schemaAtInstancePath(rootSchema: unknown, instancePath: string): unknown {
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
export function schemaAtSchemaPath(
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

export interface UnionMemberInfo {
  refs: string[];
  consts: string[];
  allConst: boolean;
}

export function unionMembers(schema: unknown): UnionMemberInfo {
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

export function additionalPropertiesIsClosed(objectSchema: unknown): boolean {
  if (!isRecord(objectSchema)) return true;
  const ap = objectSchema["additionalProperties"];
  // Explicit schema (object / boolean true) means keys are allowed; false/absent = closed.
  if (ap === false || ap === undefined) return true;
  if (ap === true) return false;
  return typeof ap !== "object" || ap === null;
}

export function objectPropertyNames(schema: unknown): string[] {
  if (!isRecord(schema)) return [];
  const props = schema["properties"];
  return isRecord(props) ? Object.keys(props) : [];
}

export function numberBounds(schema: unknown): string[] {
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
