/**
 * SCALE_REFERENCE — per-Scale* component API docs for the docs site.
 *
 * Catalog data is precomputed from SCALE_CAPABILITIES + SpecDeclarations
 * (`scripts/gen-reference-catalogs.ts`) so reference pages never load TypeBox.
 * Shells under packages/svelte/src/lib/scale/ are declaration-only; document
 * this catalog instead of TypeDoc.
 */
import {
  SCALE_CAPABILITIES,
  STYLE_ORDINAL_SCALE_HELPERS,
  scaleCapabilityCamelHelpers,
  type ScaleCapability,
} from "./capabilities.js";
import { SCALE_REFERENCE_DATA } from "./generated/scale-reference-data.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ScaleParamDoc {
  readonly name: string;
  readonly description: string;
  readonly typeSummary: string;
  readonly required: boolean;
}

export type ScaleFamily = ScaleCapability["family"];

/** Canonical aesthetic channel(s) this Scale* component configures. */
export type ScaleAesthetic =
  | "x"
  | "y"
  | "color"
  | "fill"
  | "size"
  | "linewidth"
  | "alpha"
  | "shape"
  | "linetype";

export interface ScaleReferenceEntry {
  /** Helper name, e.g. scaleXContinuous (Colour aliases use Colour spelling). */
  readonly helper: string;
  /** Route slug — snake_case stem without the scale prefix (e.g. x_continuous). */
  readonly slug: string;
  /** Svelte component export, e.g. ScaleXContinuous. */
  readonly component: string;
  readonly family: ScaleFamily;
  /** Aesthetic channels written by this helper (usually one). */
  readonly aesthetics: readonly ScaleAesthetic[];
  /** Canonical post-normalize scale type(s) this helper authors. */
  readonly scaleType: string;
  /** Forced transform when the helper pins one (log10/sqrt); else undefined. */
  readonly transform?: "log10" | "sqrt";
  /** Forced temporalKind when the helper pins one. */
  readonly temporalKind?: string;
  /** Short purpose text for index + detail lede. */
  readonly summary: string;
  /** TypeScript options type name (or Omit expression) for the shell props. */
  readonly optionsType: string;
  /** Authoring props (schema-derived + helper sugar). */
  readonly params: readonly ScaleParamDoc[];
  /**
   * How this scale interacts with guides: axis for position; legend/colorbar/
   * colorsteps for style; "none" when guide: "none" is typical.
   */
  readonly guide: string;
  /**
   * When set, this component is a binding-identical re-export of another
   * (British Colour spelling or *Ordinal → *Discrete).
   */
  readonly aliasOf?: string;
  /** Alternate component names that re-export this shell. */
  readonly alsoExportedAs: readonly string[];
}

// ---------------------------------------------------------------------------
// Naming
// ---------------------------------------------------------------------------

/** scaleXContinuous → ScaleXContinuous */
export function componentNameForScaleHelper(helper: string): string {
  if (!helper.startsWith("scale")) {
    throw new Error(`SCALE_REFERENCE: expected scale* helper, got "${helper}"`);
  }
  return "S" + helper.slice(1);
}

/** scaleXContinuous → x_continuous; scaleColorViridisC → color_viridis_c */
export function slugForScaleHelper(helper: string): string {
  const stem = helper.startsWith("scale") ? helper.slice(5) : helper;
  return stem
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

/** Primary Scale* helpers (no Colour / Ordinal-only aliases). */
export function primaryScaleHelpers(): readonly string[] {
  return scaleCapabilityCamelHelpers();
}

/**
 * Every public Scale* surface: primary shells + Colour aliases + Ordinal
 * style aliases (binding-identical re-exports).
 */
export function allScaleHelpers(): readonly string[] {
  const primary = scaleCapabilityCamelHelpers();
  const colour = primary
    .filter((h) => h.startsWith("scaleColor"))
    .map((h) => h.replace("Color", "Colour"));
  return [...new Set([...primary, ...colour, ...STYLE_ORDINAL_SCALE_HELPERS])].toSorted();
}

/**
 * Complete per-scale API reference. Keys are route slugs
 * (e.g. color_continuous, x_log10). Precomputed at gen time.
 */
export const SCALE_REFERENCE: Readonly<Record<string, ScaleReferenceEntry>> =
  SCALE_REFERENCE_DATA as unknown as Readonly<Record<string, ScaleReferenceEntry>>;

/** Stable sorted list for docs index, search, and inventory. */
export function scaleReferenceList(): readonly ScaleReferenceEntry[] {
  return Object.values(SCALE_REFERENCE).toSorted((a, b) => a.slug.localeCompare(b.slug));
}

/** Primary (non-alias) entries only. */
export function scaleReferencePrimaries(): readonly ScaleReferenceEntry[] {
  return scaleReferenceList().filter((e) => e.aliasOf === undefined);
}

/** Group primaries by family for the landing page. */
export function scaleReferenceByFamily(): Readonly<
  Record<ScaleFamily, readonly ScaleReferenceEntry[]>
> {
  const groups = {} as Record<ScaleFamily, ScaleReferenceEntry[]>;
  for (const cap of SCALE_CAPABILITIES) {
    groups[cap.family] = [];
  }
  for (const entry of scaleReferencePrimaries()) {
    groups[entry.family].push(entry);
  }
  for (const family of Object.keys(groups) as ScaleFamily[]) {
    groups[family] = Object.freeze(
      groups[family].toSorted((a, b) => a.slug.localeCompare(b.slug)),
    ) as ScaleReferenceEntry[];
  }
  return Object.freeze(groups);
}

/** Display labels for capability families on the index page. */
export const SCALE_FAMILY_LABELS: Readonly<Record<ScaleFamily, string>> = Object.freeze({
  "position-continuous": "Position — continuous",
  "position-binned": "Position — binned",
  "position-temporal": "Position — temporal",
  "position-discrete": "Position — discrete",
  "color-fill": "Color and fill",
  "numeric-style": "Size, linewidth, and alpha",
  "finite-style": "Shape and linetype",
});

/** Known scale reference slugs (for route entry generation). */
export function knownScaleSlugs(): readonly string[] {
  return scaleReferenceList().map((e) => e.slug);
}
