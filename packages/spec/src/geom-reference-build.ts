/**
 * GEOM_REFERENCE builder (SpecDeclarations walk). Gen-only:
 * `scripts/gen-reference-catalogs.ts`. Runtime uses generated/geom-reference-data.ts.
 */
import type { TSchema } from "typebox";

import {
  GEOM_ALIASES,
  GEOM_DEFAULTS,
  KNOWN_GEOMS,
  type AliasGeomName,
  type GeomName,
  type PositionName,
  type StatName,
} from "./schema-catalog.js";
import { SpecDeclarations } from "./schema-declarations.js";

type SpecDecl = typeof SpecDeclarations;
type DeclKey = keyof SpecDecl;

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface GeomParamDoc {
  readonly name: string;
  readonly description: string;
  /** Human type summary: number, string, boolean, union literals, ref name. */
  readonly typeSummary: string;
  readonly required: boolean;
}

export interface GeomReferenceEntry {
  readonly name: GeomName;
  /** Route slug — same as geom name (snake_case). */
  readonly slug: string;
  /** Svelte component export, e.g. GeomPoint. */
  readonly component: string;
  /** Short purpose text from the layer schema (geom literal description preferred). */
  readonly summary: string;
  readonly defaultStat: StatName;
  readonly defaultPosition: PositionName;
  readonly allowedStats: readonly StatName[];
  readonly allowedPositions: readonly PositionName[];
  /** Params type name in SpecDeclarations (e.g. PointParams). */
  readonly paramsType: string;
  /** Direct props on the Svelte shell / keys of layer.params. */
  readonly params: readonly GeomParamDoc[];
  /** Set when normalize() rewrites this geom to another. */
  readonly aliasOf?: Exclude<GeomName, AliasGeomName>;
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** snake_case geom → GeomPascalCase component name. */
function componentNameForGeom(geom: string): string {
  const pascal = geom
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `Geom${pascal}`;
}

// ---------------------------------------------------------------------------
// Schema walkers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

function resolveDeclaration(name: string, seen: Set<string> = new Set()): TSchema {
  if (seen.has(name)) {
    throw new Error(`GEOM_REFERENCE: cyclic SpecDeclarations ref involving "${name}"`);
  }
  if (!(name in SpecDeclarations)) {
    throw new Error(`GEOM_REFERENCE: SpecDeclarations has no entry "${name}"`);
  }
  seen.add(name);
  const schema = SpecDeclarations[name as DeclKey] as TSchema & { $ref?: string };
  if (typeof schema.$ref === "string") {
    return resolveDeclaration(schema.$ref, seen);
  }
  return schema;
}

function refName(node: Record<string, unknown>): string | undefined {
  const ref = node["$ref"];
  return typeof ref === "string" ? ref : undefined;
}

function descriptionOf(node: unknown, depth = 0): string {
  if (!isRecord(node) || depth > 8) return "";
  const d = node["description"];
  if (typeof d === "string" && d.trim() !== "") return d;
  // Type.Ref("Foo") without an inline description — fall back to the target type.
  const ref = refName(node);
  if (ref !== undefined) {
    return descriptionOf(resolveDeclaration(ref), depth + 1);
  }
  return "";
}

/**
 * Collect string const literals from a TypeBox union / literal / $ref node.
 * Order follows schema declaration order (stable for docs).
 */
function collectStringConsts(node: unknown, depth = 0): string[] {
  if (!isRecord(node) || depth > 12) return [];
  const ref = refName(node);
  if (ref !== undefined) {
    return collectStringConsts(resolveDeclaration(ref), depth + 1);
  }
  if (typeof node["const"] === "string") {
    return [node["const"]];
  }
  const anyOf = node["anyOf"];
  if (Array.isArray(anyOf)) {
    const out: string[] = [];
    for (const branch of anyOf) {
      out.push(...collectStringConsts(branch, depth + 1));
    }
    return out;
  }
  const oneOf = node["oneOf"];
  if (Array.isArray(oneOf)) {
    const out: string[] = [];
    for (const branch of oneOf) {
      out.push(...collectStringConsts(branch, depth + 1));
    }
    return out;
  }
  return [];
}

function typeSummaryOf(node: unknown, depth = 0): string {
  if (!isRecord(node) || depth > 8) return "unknown";
  const ref = refName(node);
  if (ref !== undefined) {
    return ref;
  }
  if (typeof node["const"] === "string" || typeof node["const"] === "number") {
    return JSON.stringify(node["const"]);
  }
  const anyOf = node["anyOf"];
  if (Array.isArray(anyOf)) {
    const parts = anyOf.map((branch) => typeSummaryOf(branch, depth + 1));
    // Collapse pure string-const unions to "a" | "b"
    if (parts.every((p) => p.startsWith('"') || p.startsWith("'") || /^-?\d/.test(p))) {
      return [...new Set(parts)].join(" | ");
    }
    return parts.join(" | ");
  }
  const type = node["type"];
  if (type === "number" || type === "integer") return "number";
  if (type === "string") return "string";
  if (type === "boolean") return "boolean";
  if (type === "array") {
    const items = node["items"];
    return `Array<${typeSummaryOf(items, depth + 1)}>`;
  }
  if (type === "object") return "object";
  if (Array.isArray(type)) {
    return type.filter((t) => t !== "null").join(" | ") || "unknown";
  }
  return "unknown";
}

function isRequiredProp(schema: TSchema & { required?: string[] }, name: string): boolean {
  return Array.isArray(schema.required) && schema.required.includes(name);
}

interface LayerLoc {
  key: DeclKey;
  layer: TSchema & {
    description?: string;
    properties?: {
      geom?: { const?: string; description?: string };
      stat?: unknown;
      position?: unknown;
      params?: unknown;
    };
  };
}

function layerForGeom(geom: GeomName): LayerLoc {
  for (const key of Object.keys(SpecDeclarations) as DeclKey[]) {
    if (!key.endsWith("Layer")) continue;
    const layer = SpecDeclarations[key] as LayerLoc["layer"];
    if (layer.properties?.geom?.const === geom) {
      return { key, layer };
    }
  }
  throw new Error(`GEOM_REFERENCE: no *Layer schema with geom const "${geom}"`);
}

function paramsTypeNameForLayer(layer: LayerLoc["layer"], geom: GeomName, key: string): string {
  const paramsNode = layer.properties?.params;
  if (paramsNode === undefined) {
    throw new Error(`GEOM_REFERENCE: layer ${key} has no params field for geom "${geom}"`);
  }
  const ref = findRef(paramsNode);
  if (ref === undefined) {
    throw new Error(`GEOM_REFERENCE: layer ${key} params has no $ref for geom "${geom}"`);
  }
  return ref;
}

function paramsDocsForType(paramsType: string): readonly GeomParamDoc[] {
  const resolved = resolveDeclaration(paramsType) as TSchema & {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  const props = resolved.properties;
  if (props === undefined) return Object.freeze([]);
  const docs: GeomParamDoc[] = [];
  for (const [name, propSchema] of Object.entries(props)) {
    docs.push({
      name,
      description: descriptionOf(propSchema),
      typeSummary: typeSummaryOf(propSchema),
      required: isRequiredProp(resolved, name),
    });
  }
  return Object.freeze(docs);
}

function buildEntry(geom: GeomName): GeomReferenceEntry {
  const { key, layer } = layerForGeom(geom);
  const geomNode = layer.properties?.geom;
  const summary =
    (typeof geomNode?.description === "string" && geomNode.description.trim() !== ""
      ? geomNode.description
      : undefined) ??
    (typeof layer.description === "string" && layer.description.trim() !== ""
      ? layer.description
      : undefined) ??
    `${componentNameForGeom(geom)} layer (${geom}).`;

  const allowedStats = collectStringConsts(layer.properties?.stat) as StatName[];
  const allowedPositions = collectStringConsts(layer.properties?.position) as PositionName[];
  if (allowedStats.length === 0) {
    throw new Error(`GEOM_REFERENCE: geom "${geom}" (${key}) has no allowed stats`);
  }
  if (allowedPositions.length === 0) {
    throw new Error(`GEOM_REFERENCE: geom "${geom}" (${key}) has no allowed positions`);
  }

  const paramsType = paramsTypeNameForLayer(layer, geom, key);
  const defaults = GEOM_DEFAULTS[geom];
  const base = {
    name: geom,
    slug: geom,
    component: componentNameForGeom(geom),
    summary,
    defaultStat: defaults.stat,
    defaultPosition: defaults.position,
    allowedStats: Object.freeze(allowedStats),
    allowedPositions: Object.freeze(allowedPositions),
    paramsType,
    params: paramsDocsForType(paramsType),
  } satisfies Omit<GeomReferenceEntry, "aliasOf">;

  if (Object.hasOwn(GEOM_ALIASES, geom)) {
    return Object.freeze({
      ...base,
      aliasOf: GEOM_ALIASES[geom as AliasGeomName],
    });
  }
  return Object.freeze(base);
}

export function buildGeomReference(): Readonly<Record<GeomName, GeomReferenceEntry>> {
  const out = {} as Record<GeomName, GeomReferenceEntry>;
  for (const geom of KNOWN_GEOMS) {
    out[geom] = buildEntry(geom);
  }
  return Object.freeze(out);
}
