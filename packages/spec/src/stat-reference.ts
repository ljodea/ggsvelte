/**
 * STAT_REFERENCE — per-stat API docs for the docs site.
 *
 * Catalog data is precomputed (`scripts/gen-reference-catalogs.ts`) so
 * reference pages never load TypeBox or the validate data-checks path.
 * Stats are not Svelte components: set `stat` on a `<Geom*>` shell or JSON layer.
 */
import { KNOWN_STATS, type GeomName, type StatName } from "./schema-catalog.js";
import { STAT_REFERENCE_DATA } from "./generated/stat-reference-data.js";

export interface StatReferenceEntry {
  readonly name: StatName;
  /** Route slug — same as stat name (snake_case). */
  readonly slug: string;
  /** Short purpose text for the stat transform. */
  readonly summary: string;
  /**
   * Columns this stat publishes for `{ stat: "…" }` channel resolution
   * (after_stat). Empty when the stat passes rows through or only rewrites
   * positions without new after_stat names in STAT_COLUMNS.
   */
  readonly generatedColumns: readonly string[];
  /** Geoms whose layer schema allows this stat. */
  readonly compatibleGeoms: readonly GeomName[];
  /** Geoms whose GEOM_DEFAULTS.stat is this stat. */
  readonly defaultForGeoms: readonly GeomName[];
}

/**
 * Complete per-stat API reference. Keys are exactly KNOWN_STATS.
 * Precomputed at gen time from GEOM_REFERENCE + STAT_COLUMNS.
 */
export const STAT_REFERENCE: Readonly<Record<StatName, StatReferenceEntry>> = STAT_REFERENCE_DATA;

/** Stable list order matching KNOWN_STATS (docs index, search, inventory). */
export function statReferenceList(): readonly StatReferenceEntry[] {
  return KNOWN_STATS.map((stat) => STAT_REFERENCE[stat]);
}
