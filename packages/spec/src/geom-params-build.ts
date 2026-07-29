/**
 * GEOM_PARAM_KEYS builder (SpecDeclarations walk). Gen-only:
 * `scripts/gen-reference-catalogs.ts`. Runtime uses generated/geom-param-keys.ts.
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

export function buildGeomParamKeys(): Readonly<Record<GeomName, readonly string[]>> {
  const out = {} as Record<GeomName, readonly string[]>;
  for (const geom of KNOWN_GEOMS) {
    out[geom] = paramKeysForGeom(geom);
  }
  return Object.freeze(out);
}
