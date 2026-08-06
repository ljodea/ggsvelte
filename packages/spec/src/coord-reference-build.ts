/**
 * COORD_REFERENCE builder. Gen-only: `scripts/gen-reference-catalogs.ts`.
 * Runtime uses generated/coord-reference-data.ts.
 */
import { SpecDeclarations } from "./schema-declarations.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Portable coord type literals (CoordSpec discriminants).
 * `flip` shares CoordCartesianSpec with `cartesian` but is a separate shell.
 */
export const KNOWN_COORD_TYPES = ["cartesian", "flip", "transform", "fixed", "sf"] as const;

export type CoordTypeName = (typeof KNOWN_COORD_TYPES)[number];

export interface CoordParamDoc {
  readonly name: string;
  readonly description: string;
  readonly typeSummary: string;
  readonly required: boolean;
}

export interface CoordReferenceEntry {
  readonly name: CoordTypeName;
  /** Route slug — same as the portable type literal. */
  readonly slug: string;
  /** Svelte component export, e.g. CoordFixed. */
  readonly component: string;
  /** Portable `type` discriminant (same as name). */
  readonly typeLiteral: CoordTypeName;
  /** SpecDeclarations key for the coord options object. */
  readonly schemaType: string;
  /**
   * Free-standing helper (e.g. coordFixed). Empty when only the Svelte shell
   * and/or builder method exist (cartesian, flip).
   */
  readonly helper: string;
  /** ggplot2-style snake_case alias (e.g. coord_fixed). Empty with helper. */
  readonly helperAlias: string;
  /** Extra free-standing helpers that produce the same JSON (coordEqual). */
  readonly alsoHelpers: readonly string[];
  /** Svelte re-export aliases of the shell (CoordEqual). */
  readonly alsoExportedAs: readonly string[];
  /** Builder methods that set this coord (e.g. coordFlip, coordFixed). */
  readonly builderMethods: readonly string[];
  /** Short purpose text for index + detail lede. */
  readonly summary: string;
  /**
   * Options on the Svelte shell / JSON coord object, excluding the fixed
   * `type` discriminant. Nested axis fields for transform live in axisParams.
   */
  readonly params: readonly CoordParamDoc[];
  /**
   * Shared axis options for coord_transform x/y (from CoordTransformAxisSpec).
   * Empty for other coord types.
   */
  readonly axisParams: readonly CoordParamDoc[];
}

// ---------------------------------------------------------------------------
// Static catalog metadata
// ---------------------------------------------------------------------------

const COORD_SUMMARIES: Readonly<Record<CoordTypeName, string>> = Object.freeze({
  cartesian:
    'Default Cartesian coordinates. Omit coord or use CoordCartesian to clear a prior REPLACE-family coord; normalize() drops bare { type: "cartesian" }.',
  flip: "Swap display axes so semantic x paints vertically and y horizontally. The mechanism for horizontal bar charts; stack, dodge, and hit-testing follow the flip.",
  transform:
    "Post-stat coordinate projection with independent x/y transforms (identity, log10, sqrt), semantic viewport limits, reverse, and panel clipping. Distinct from pre-stat scale transforms.",
  fixed:
    "Fixed physical data-unit aspect ratio (y-unit length / x-unit length). Layout fits the largest centered data rectangle after chart chrome; rejects free positional facet scales.",
  sf: "Fixed-aspect coordinates for already-projected geom_sf maps. Same layout as fixed; no CRS reproject or graticules in v1 — data must already be in plot space.",
});

const COORD_COMPONENTS: Readonly<Record<CoordTypeName, string>> = Object.freeze({
  cartesian: "CoordCartesian",
  flip: "CoordFlip",
  transform: "CoordTransform",
  fixed: "CoordFixed",
  sf: "CoordSf",
});

const COORD_SCHEMA_TYPES: Readonly<Record<CoordTypeName, string>> = Object.freeze({
  cartesian: "CoordCartesianSpec",
  flip: "CoordCartesianSpec",
  transform: "CoordTransformSpec",
  fixed: "CoordFixedSpec",
  sf: "CoordSfSpec",
});

const COORD_HELPERS: Readonly<
  Record<CoordTypeName, { camel: string; snake: string; also: readonly string[] }>
> = Object.freeze({
  cartesian: { camel: "", snake: "", also: [] },
  flip: { camel: "", snake: "", also: [] },
  transform: { camel: "coordTransform", snake: "coord_transform", also: [] },
  fixed: {
    camel: "coordFixed",
    snake: "coord_fixed",
    also: ["coordEqual", "coord_equal"],
  },
  sf: { camel: "coordSf", snake: "coord_sf", also: [] },
});

const COORD_BUILDER_METHODS: Readonly<Record<CoordTypeName, readonly string[]>> = Object.freeze({
  cartesian: ["coord"],
  flip: ["coordFlip", "coord"],
  transform: ["coordTransform", "coord"],
  fixed: ["coordFixed", "coordEqual", "coord"],
  sf: ["coordSf", "coord"],
});

const COORD_ALSO_EXPORTED: Readonly<Record<CoordTypeName, readonly string[]>> = Object.freeze({
  cartesian: [],
  flip: [],
  transform: [],
  fixed: ["CoordEqual"],
  sf: [],
});

/**
 * Schema props sometimes omit descriptions on $ref fields. Prefer
 * SpecDeclarations text; fall back so every param has prose.
 */
const PARAM_DESCRIPTION_FALLBACKS: Readonly<Record<string, string>> = Object.freeze({
  x: "Optional x-axis projector: transform, semantic limits, reverse, and expand. Accepts a transform name string or an axis options object on the helper/shell.",
  y: "Optional y-axis projector: transform, semantic limits, reverse, and expand. Accepts a transform name string or an axis options object on the helper/shell.",
});

// ---------------------------------------------------------------------------
// Schema walkers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function refName(node: Record<string, unknown>): string | undefined {
  const ref = node["$ref"];
  return typeof ref === "string" ? ref : undefined;
}

function typeSummaryOf(node: unknown, depth = 0): string {
  if (!isRecord(node) || depth > 8) return "unknown";
  const ref = refName(node);
  if (ref !== undefined) return ref;
  if (typeof node["const"] === "string" || typeof node["const"] === "number") {
    return JSON.stringify(node["const"]);
  }
  const anyOf = node["anyOf"];
  if (Array.isArray(anyOf)) {
    const parts = anyOf.map((branch) => typeSummaryOf(branch, depth + 1));
    if (parts.every((p) => p.startsWith('"') || p.startsWith("'") || /^-?\d/.test(p))) {
      return [...new Set(parts)].join(" | ");
    }
    return parts.join(" | ");
  }
  const type = node["type"];
  if (type === "number" || type === "integer") return type === "integer" ? "integer" : "number";
  if (type === "string") return "string";
  if (type === "boolean") return "boolean";
  if (type === "object") return "object";
  if (type === "array") {
    const items = node["items"];
    const itemSummary = items === undefined ? "unknown" : typeSummaryOf(items, depth + 1);
    const min = node["minItems"];
    const max = node["maxItems"];
    if (typeof min === "number" && typeof max === "number" && min === max) {
      return `[${Array.from({ length: min }, () => itemSummary).join(", ")}]`;
    }
    return `${itemSummary}[]`;
  }
  if (Array.isArray(type)) {
    return type.filter((t) => t !== "null").join(" | ") || "unknown";
  }
  return "unknown";
}

function descriptionOf(node: unknown, name: string): string {
  if (
    isRecord(node) &&
    typeof node["description"] === "string" &&
    node["description"].trim() !== ""
  ) {
    return node["description"];
  }
  return PARAM_DESCRIPTION_FALLBACKS[name] ?? "";
}

function paramsFromSchema(schemaType: string): readonly CoordParamDoc[] {
  if (!(schemaType in SpecDeclarations)) {
    throw new Error(`COORD_REFERENCE: SpecDeclarations has no entry "${schemaType}"`);
  }
  const schema = SpecDeclarations[schemaType as keyof typeof SpecDeclarations] as {
    properties?: Record<string, unknown>;
    required?: readonly string[];
  };
  const props = schema.properties;
  if (props === undefined) return Object.freeze([]);
  const required = new Set(schema.required ?? []);
  const docs: CoordParamDoc[] = [];
  for (const [name, propSchema] of Object.entries(props)) {
    if (name === "type") continue;
    const description = descriptionOf(propSchema, name);
    if (description.trim() === "") {
      throw new Error(
        `COORD_REFERENCE: ${schemaType}.${name} has no schema description and no fallback`,
      );
    }
    docs.push({
      name,
      description,
      typeSummary: typeSummaryOf(propSchema),
      required: required.has(name),
    });
  }
  return Object.freeze(docs);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function buildEntry(name: CoordTypeName): CoordReferenceEntry {
  const helpers = COORD_HELPERS[name];
  const schemaType = COORD_SCHEMA_TYPES[name];
  const params =
    name === "cartesian" || name === "flip"
      ? Object.freeze([]) // only the fixed type discriminant
      : paramsFromSchema(schemaType);
  const axisParams =
    name === "transform" ? paramsFromSchema("CoordTransformAxisSpec") : Object.freeze([]);

  return Object.freeze({
    name,
    slug: name,
    component: COORD_COMPONENTS[name],
    typeLiteral: name,
    schemaType,
    helper: helpers.camel,
    helperAlias: helpers.snake,
    alsoHelpers: helpers.also,
    alsoExportedAs: COORD_ALSO_EXPORTED[name],
    builderMethods: COORD_BUILDER_METHODS[name],
    summary: COORD_SUMMARIES[name],
    params,
    axisParams,
  });
}

export function buildCoordReference(): Readonly<Record<CoordTypeName, CoordReferenceEntry>> {
  const out = {} as Record<CoordTypeName, CoordReferenceEntry>;
  for (const name of KNOWN_COORD_TYPES) {
    out[name] = buildEntry(name);
  }
  return Object.freeze(out);
}
