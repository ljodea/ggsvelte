/**
 * GEOM_REFERENCE — per-geom API docs for the docs site.
 *
 * Catalog data is precomputed from SpecDeclarations
 * (`scripts/gen-reference-catalogs.ts`) so reference pages never load TypeBox.
 * Shells under packages/svelte/src/lib/geoms/ are declaration-only; document
 * this catalog instead of TypeDoc.
 */
import {
  KNOWN_GEOMS,
  type AliasGeomName,
  type GeomName,
  type PositionName,
  type StatName,
} from "./schema-catalog.js";
import { GEOM_REFERENCE_DATA } from "./generated/geom-reference-data.js";

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

export interface SharedLayerPropDoc {
  readonly name: string;
  readonly description: string;
  readonly typeSummary: string;
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
// Shared layer props (every Geom* shell + every *Layer schema)
// ---------------------------------------------------------------------------

/** Props common to every `<Geom*>` shell and JSON layer, outside geom params. */
export const SHARED_LAYER_PROPS: readonly SharedLayerPropDoc[] = Object.freeze([
  {
    name: "data",
    typeSummary: "DataInput | readonly Record<string, unknown>[]",
    description:
      "Optional layer-local data. When omitted, the layer inherits plot-level data. Inline rows, inline columns, or a named dataset.",
  },
  {
    name: "aes",
    typeSummary: "Aes",
    description:
      "Optional aesthetic mapping for this layer. Merges over plot-level aes; set a channel to null to unset an inherited mapping.",
  },
  {
    name: "stat",
    typeSummary: "StatName (geom-specific)",
    description:
      "Statistical transform applied before drawing. Omit to use the geom default (see defaultStat). Only values listed in allowedStats validate.",
  },
  {
    name: "position",
    typeSummary: "PositionName (geom-specific)",
    description:
      "Position adjustment for how marks share coordinate space. Omit to use the geom default. Only values listed in allowedPositions validate.",
  },
  {
    name: "positionParams",
    typeSummary: "PositionParams",
    description:
      "Parameters for jitter (width, height, seed) or nudge (x, y). Valid only when the layer allows those positions.",
  },
  {
    name: "render",
    typeSummary: '"svg" | "canvas" | "auto"',
    description: "Optional per-layer render backend override. When omitted, the plot chooses.",
  },
  {
    name: "inspect",
    typeSummary: "false",
    description:
      "Set false to exclude this layer from inspection: its marks never become tooltip, hover, or keyboard-traversal candidates. For decorative layers whose marks would otherwise capture the pointer.",
  },
]);

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** snake_case geom → GeomPascalCase component name. */
export function componentNameForGeom(geom: string): string {
  const pascal = geom
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
  return `Geom${pascal}`;
}

/**
 * Complete per-geom API reference derived from SpecDeclarations at gen time.
 * Keys are exactly KNOWN_GEOMS; a missing geom is a generate-time throw.
 */
export const GEOM_REFERENCE: Readonly<Record<GeomName, GeomReferenceEntry>> =
  GEOM_REFERENCE_DATA as unknown as Readonly<Record<GeomName, GeomReferenceEntry>>;

/** Stable list order matching KNOWN_GEOMS (docs index, search, inventory). */
export function geomReferenceList(): readonly GeomReferenceEntry[] {
  return KNOWN_GEOMS.map((geom) => GEOM_REFERENCE[geom]);
}
