/**
 * POSITION_REFERENCE — per-position API docs for the docs site.
 *
 * Catalog data is precomputed (`scripts/gen-reference-catalogs.ts`) so
 * reference pages never load TypeBox. Positions are not Svelte components:
 * set `position` on a `<Geom*>` shell or JSON layer.
 */
import { KNOWN_POSITIONS, type GeomName, type PositionName } from "./schema-catalog.js";
import { POSITION_REFERENCE_DATA } from "./generated/position-reference-data.js";

export interface PositionParamDoc {
  readonly name: string;
  readonly description: string;
  readonly typeSummary: string;
  readonly required: boolean;
}

export interface PositionReferenceEntry {
  readonly name: PositionName;
  /** Route slug — same as position name (snake_case). */
  readonly slug: string;
  readonly summary: string;
  /** Params valid for this position (jitter/nudge); empty for others. */
  readonly params: readonly PositionParamDoc[];
  /** Geoms whose layer schema allows this position. */
  readonly compatibleGeoms: readonly GeomName[];
  /** Geoms whose GEOM_DEFAULTS.position is this position. */
  readonly defaultForGeoms: readonly GeomName[];
}

/**
 * Complete per-position API reference. Keys are exactly KNOWN_POSITIONS.
 * Precomputed at gen time.
 */
export const POSITION_REFERENCE: Readonly<Record<PositionName, PositionReferenceEntry>> =
  POSITION_REFERENCE_DATA;

/** Stable list order matching KNOWN_POSITIONS (docs index, search, inventory). */
export function positionReferenceList(): readonly PositionReferenceEntry[] {
  return KNOWN_POSITIONS.map((position) => POSITION_REFERENCE[position]);
}
