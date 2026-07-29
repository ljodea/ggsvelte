/**
 * GUIDE_REFERENCE — per-guide API docs for the docs site.
 *
 * Catalog data is precomputed from SpecDeclarations
 * (`scripts/gen-reference-catalogs.ts`) so reference pages never load TypeBox.
 * Guides are declaration-only Svelte shells keyed by aesthetic channel.
 */
import { GUIDE_REFERENCE_DATA } from "./generated/guide-reference-data.js";

/** Portable guide type literals (GuideSpec discriminators). */
export const KNOWN_GUIDE_TYPES = ["legend", "colorbar", "colorsteps", "axis", "none"] as const;

export type GuideTypeName = (typeof KNOWN_GUIDE_TYPES)[number];

/** Every aesthetic a guide can be keyed by (GuidesSpec keys). */
export const GUIDE_CHANNELS = [
  "x",
  "y",
  "color",
  "fill",
  "size",
  "linewidth",
  "alpha",
  "shape",
  "linetype",
] as const;

export type GuideChannelName = (typeof GUIDE_CHANNELS)[number];

export interface GuideParamDoc {
  readonly name: string;
  readonly description: string;
  readonly typeSummary: string;
  readonly required: boolean;
}

export interface GuideReferenceEntry {
  readonly name: GuideTypeName;
  /** Route slug — same as the portable type literal. */
  readonly slug: string;
  /** Svelte component export, e.g. GuideLegend. */
  readonly component: string;
  /** Portable `type` discriminant (same as name). */
  readonly typeLiteral: GuideTypeName;
  /** SpecDeclarations key for the guide options object. */
  readonly schemaType: string;
  /** Fluent helper, e.g. guideLegend. */
  readonly helper: string;
  /** ggplot2-style snake_case alias, e.g. guide_legend. */
  readonly helperAlias: string;
  /** Short purpose text for the guide variant. */
  readonly summary: string;
  /**
   * Aesthetics this guide type may key. Subset of GUIDE_CHANNELS; scale family
   * constraints (sequential → colorbar, binned → colorsteps) are prose on the
   * page, not a separate field.
   */
  readonly channels: readonly GuideChannelName[];
  /**
   * Options on the Svelte shell / JSON guide object, excluding the fixed
   * `type` discriminant. The shell also takes `channel` (not part of *GuideSpec).
   */
  readonly params: readonly GuideParamDoc[];
}

/**
 * Complete per-guide API reference. Keys are exactly KNOWN_GUIDE_TYPES.
 * Precomputed at gen time.
 */
export const GUIDE_REFERENCE: Readonly<Record<GuideTypeName, GuideReferenceEntry>> =
  GUIDE_REFERENCE_DATA as unknown as Readonly<Record<GuideTypeName, GuideReferenceEntry>>;

/** Stable list order matching KNOWN_GUIDE_TYPES (docs index, search, inventory). */
export function guideReferenceList(): readonly GuideReferenceEntry[] {
  return KNOWN_GUIDE_TYPES.map((name) => GUIDE_REFERENCE[name]);
}
