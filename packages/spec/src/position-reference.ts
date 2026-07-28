/**
 * POSITION_REFERENCE — per-position API docs derived from KNOWN_POSITIONS,
 * PositionParams (SpecDeclarations), and GEOM_REFERENCE (compatible geoms).
 *
 * Positions are not Svelte components: set `position` on a `<Geom*>` shell or
 * JSON layer, and optional `positionParams` for jitter/nudge. Used by
 * `/reference/positions`.
 */
import type { TSchema } from "typebox";

import {
  GEOM_DEFAULTS,
  KNOWN_GEOMS,
  KNOWN_POSITIONS,
  type GeomName,
  type PositionName,
} from "./schema-catalog.js";
import { SpecDeclarations } from "./schema-declarations.js";
import { GEOM_REFERENCE } from "./geom-reference.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PositionParamDoc {
  readonly name: string;
  readonly description: string;
  readonly typeSummary: string;
  readonly required: boolean;
}

export interface PositionReferenceEntry {
  readonly name: PositionName;
  /** Route slug — same as position name. */
  readonly slug: string;
  /** Short purpose text for the adjustment. */
  readonly summary: string;
  /**
   * Keys of positionParams that apply to this position (from PositionParams
   * schema, filtered by which adjustment uses them).
   */
  readonly params: readonly PositionParamDoc[];
  /** Geoms whose layer schema allows this position. */
  readonly compatibleGeoms: readonly GeomName[];
  /** Geoms whose GEOM_DEFAULTS.position is this position. */
  readonly defaultForGeoms: readonly GeomName[];
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

const POSITION_SUMMARIES: Readonly<Record<PositionName, string>> = Object.freeze({
  identity:
    "Leave mark coordinates unchanged. Default for most geoms: each mark keeps its post-stat (x, y).",
  stack:
    "Stack groups at each x slot so heights accumulate (positive up, negative down). Default for bar, col, histogram, and area; trains the scale on stacked totals.",
  fill: "Stack groups then rescale each x slot to proportions (positive and negative runs separately). Same geom set as stack; y domain becomes proportions.",
  dodge:
    "Place groups side by side within each x band instead of overlapping. Default for boxplot and violin; used when comparing categories at the same x.",
  jitter:
    "Add seeded random offsets so overplotted points separate. Configure with positionParams width/height/seed (always seeded for reproducibility).",
  nudge:
    "Apply a fixed offset (positionParams.x / y) per mark — useful for labels beside points. Offsets are data units or band-step fractions.",
});

/** PositionParams property keys that apply to each position. */
const PARAM_KEYS_FOR_POSITION: Readonly<Record<PositionName, readonly string[]>> = Object.freeze({
  identity: [],
  stack: [],
  fill: [],
  dodge: [],
  jitter: ["width", "height", "seed"],
  nudge: ["x", "y"],
});

// ---------------------------------------------------------------------------
// Schema walkers (minimal; PositionParams is a flat object)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function descriptionOf(node: unknown): string {
  if (!isRecord(node)) return "";
  const d = node["description"];
  return typeof d === "string" ? d : "";
}

function typeSummaryOf(node: unknown): string {
  if (!isRecord(node)) return "unknown";
  const type = node["type"];
  if (type === "number" || type === "integer") return type === "integer" ? "integer" : "number";
  if (type === "string") return "string";
  if (type === "boolean") return "boolean";
  return "unknown";
}

function positionParamsDocs(keys: readonly string[]): readonly PositionParamDoc[] {
  if (keys.length === 0) return Object.freeze([]);
  const schema = SpecDeclarations.PositionParams as TSchema & {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  const props = schema.properties;
  if (props === undefined) {
    throw new Error("POSITION_REFERENCE: PositionParams has no properties");
  }
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  const docs: PositionParamDoc[] = [];
  for (const name of keys) {
    const propSchema = props[name];
    if (propSchema === undefined) {
      throw new Error(`POSITION_REFERENCE: PositionParams missing property "${name}"`);
    }
    docs.push({
      name,
      description: descriptionOf(propSchema),
      typeSummary: typeSummaryOf(propSchema),
      required: required.has(name),
    });
  }
  return Object.freeze(docs);
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function buildCompatibleGeoms(position: PositionName): readonly GeomName[] {
  const geoms: GeomName[] = [];
  for (const geom of KNOWN_GEOMS) {
    if (GEOM_REFERENCE[geom].allowedPositions.includes(position)) {
      geoms.push(geom);
    }
  }
  return Object.freeze(geoms);
}

function buildDefaultForGeoms(position: PositionName): readonly GeomName[] {
  const geoms: GeomName[] = [];
  for (const geom of KNOWN_GEOMS) {
    if (GEOM_DEFAULTS[geom].position === position) {
      geoms.push(geom);
    }
  }
  return Object.freeze(geoms);
}

function buildEntry(position: PositionName): PositionReferenceEntry {
  return Object.freeze({
    name: position,
    slug: position,
    summary: POSITION_SUMMARIES[position],
    params: positionParamsDocs(PARAM_KEYS_FOR_POSITION[position]),
    compatibleGeoms: buildCompatibleGeoms(position),
    defaultForGeoms: buildDefaultForGeoms(position),
  });
}

function buildPositionReference(): Readonly<Record<PositionName, PositionReferenceEntry>> {
  const out = {} as Record<PositionName, PositionReferenceEntry>;
  for (const position of KNOWN_POSITIONS) {
    out[position] = buildEntry(position);
  }
  return Object.freeze(out);
}

/**
 * Complete per-position API reference. Keys are exactly KNOWN_POSITIONS.
 * Compatible geoms invert GEOM_REFERENCE; jitter/nudge params from PositionParams.
 */
export const POSITION_REFERENCE: Readonly<Record<PositionName, PositionReferenceEntry>> =
  buildPositionReference();

/** Stable list order matching KNOWN_POSITIONS (docs index, search, inventory). */
export function positionReferenceList(): readonly PositionReferenceEntry[] {
  return KNOWN_POSITIONS.map((position) => POSITION_REFERENCE[position]);
}
