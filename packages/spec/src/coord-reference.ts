/**
 * COORD_REFERENCE — per-coord API docs for the docs site.
 *
 * Catalog data is precomputed from SpecDeclarations
 * (`scripts/gen-reference-catalogs.ts`) so reference pages never load TypeBox.
 * Coord shells under packages/svelte/src/lib/coord/ are declaration-only.
 */
import { COORD_REFERENCE_DATA } from "./generated/coord-reference-data.js";

/** Portable coord type literals (CoordSpec discriminants + flip shell). */
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
   * `type` discriminant.
   */
  readonly params: readonly CoordParamDoc[];
  /**
   * Shared axis options for coord_transform x/y. Empty for other types.
   */
  readonly axisParams: readonly CoordParamDoc[];
}

/**
 * Complete per-coord API reference. Keys are exactly KNOWN_COORD_TYPES.
 * Precomputed at gen time.
 */
export const COORD_REFERENCE: Readonly<Record<CoordTypeName, CoordReferenceEntry>> =
  COORD_REFERENCE_DATA;

/** Stable list order matching KNOWN_COORD_TYPES (docs index, search, inventory). */
export function coordReferenceList(): readonly CoordReferenceEntry[] {
  return KNOWN_COORD_TYPES.map((name) => COORD_REFERENCE[name]);
}
