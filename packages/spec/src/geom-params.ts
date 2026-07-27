/**
 * GEOM_PARAM_KEYS (#1039) — param-key whitelist per geom, derived once from
 * SpecDeclarations at module load.
 *
 * Layer schemas point at *Params types via Type.Ref; a few params schemas are
 * themselves Type.Ref aliases (e.g. LinerangeParams → ErrorbarParams). Keys
 * are the enumerable Type.Object properties of the resolved params schema.
 *
 * Used by createGeomLayer so shells no longer hand-copy param lists.
 */
import type { TSchema } from "typebox";

import { KNOWN_GEOMS, type GeomName } from "./schema-catalog.js";
import { SpecDeclarations } from "./schema-declarations.js";

type SpecDecl = typeof SpecDeclarations;
type DeclKey = keyof SpecDecl;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Depth-first `$ref` string, if present. */
function findRef(node: unknown, depth = 0): string | undefined {
  if (!isRecord(node) || depth > 8) return undefined;
  const ref = node["$ref"];
  if (typeof ref === "string") return ref;
  for (const child of Object.values(node)) {
    const found = findRef(child, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

/**
 * Resolve a SpecDeclarations key through `$ref` aliases to a schema that
 * may carry `properties`. Throws on missing keys or cycles.
 */
function resolveDeclaration(name: string, seen: Set<string> = new Set()): TSchema {
  if (seen.has(name)) {
    throw new Error(`GEOM_PARAM_KEYS: cyclic SpecDeclarations ref involving "${name}"`);
  }
  if (!(name in SpecDeclarations)) {
    throw new Error(`GEOM_PARAM_KEYS: SpecDeclarations has no entry "${name}"`);
  }
  seen.add(name);
  const schema = SpecDeclarations[name as DeclKey] as TSchema & { $ref?: string };
  if (typeof schema.$ref === "string") {
    return resolveDeclaration(schema.$ref, seen);
  }
  return schema;
}

/** Params type name for a geom (e.g. "point" → "PointParams"), or null if none. */
function paramsTypeNameForGeom(geom: GeomName): string | null {
  for (const key of Object.keys(SpecDeclarations) as DeclKey[]) {
    // Layer schemas are *Layer (PointLayer, …).
    if (!key.endsWith("Layer")) continue;
    const layer = SpecDeclarations[key] as TSchema & {
      properties?: { geom?: { const?: string }; params?: unknown };
    };
    const geomConst = layer.properties?.geom?.const;
    if (geomConst !== geom) continue;
    const paramsNode = layer.properties?.params;
    if (paramsNode === undefined) {
      throw new Error(`GEOM_PARAM_KEYS: layer ${key} has no params field for geom "${geom}"`);
    }
    const ref = findRef(paramsNode);
    if (ref === undefined) {
      throw new Error(`GEOM_PARAM_KEYS: layer ${key} params has no $ref for geom "${geom}"`);
    }
    return ref;
  }
  throw new Error(`GEOM_PARAM_KEYS: no *Layer schema with geom const "${geom}"`);
}

function paramKeysForGeom(geom: GeomName): readonly string[] {
  const paramsName = paramsTypeNameForGeom(geom);
  if (paramsName === null) return Object.freeze([]);
  const resolved = resolveDeclaration(paramsName) as TSchema & {
    properties?: Record<string, unknown>;
  };
  const props = resolved.properties;
  if (props === undefined) {
    // Type.Object({}) still has properties: {}; a bare alias without properties
    // after ref resolution is treated as empty.
    return Object.freeze([]);
  }
  return Object.freeze(Object.keys(props));
}

function buildGeomParamKeys(): Readonly<Record<GeomName, readonly string[]>> {
  const out = {} as Record<GeomName, readonly string[]>;
  for (const geom of KNOWN_GEOMS) {
    out[geom] = paramKeysForGeom(geom);
  }
  return Object.freeze(out);
}

/**
 * Param property names per geom, derived from SpecDeclarations.
 * Empty array means the geom has no params object properties (e.g. blank).
 */
export const GEOM_PARAM_KEYS: Readonly<Record<GeomName, readonly string[]>> = buildGeomParamKeys();
