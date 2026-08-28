/**
 * SCALE_REFERENCE builder (SpecDeclarations + capabilities). Gen-only:
 * `scripts/gen-reference-catalogs.ts`. Runtime uses generated/scale-reference-data.ts.
 */
import {
  SCALE_CAPABILITIES,
  STYLE_ORDINAL_SCALE_HELPERS,
  scaleCapabilityCamelHelpers,
} from "./capabilities.js";
import { classifyColorFillHelper } from "./scale-reference-classify-color.js";
import { classifyPositionHelper } from "./scale-reference-classify-position.js";
import { classifyStyleHelper } from "./scale-reference-classify-style.js";
import {
  aestheticFromHelper,
  type HelperMeta,
  type ScaleAesthetic,
  type ScaleFamily,
  type ScaleParamDoc,
} from "./scale-reference-classify-support.js";

export type {
  ScaleAesthetic,
  ScaleFamily,
  ScaleParamDoc,
} from "./scale-reference-classify-support.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Per-helper classification dispatch
// ---------------------------------------------------------------------------

function classifyHelper(helper: string, family: ScaleFamily): HelperMeta {
  if (
    family === "position-continuous" ||
    family === "position-binned" ||
    family === "position-temporal" ||
    family === "position-discrete"
  ) {
    return classifyPositionHelper(helper, family);
  }
  if (family === "color-fill") return classifyColorFillHelper(helper, family);
  return classifyStyleHelper(helper, family);
}

// ---------------------------------------------------------------------------
// Build catalog
// ---------------------------------------------------------------------------

function familyForHelper(helper: string): ScaleFamily {
  for (const cap of SCALE_CAPABILITIES) {
    if ((cap.helpers as readonly string[]).includes(helper)) {
      return cap.family;
    }
  }
  // Ordinal style aliases live outside the main ledger helper arrays.
  if ((STYLE_ORDINAL_SCALE_HELPERS as readonly string[]).includes(helper)) {
    if (helper.includes("Shape") || helper.includes("Linetype")) return "finite-style";
    return "numeric-style";
  }
  // Colour spelling is on the ledger under color-fill.
  if (helper.includes("Colour")) {
    return "color-fill";
  }
  throw new Error(`SCALE_REFERENCE: helper "${helper}" not in SCALE_CAPABILITIES`);
}

function primaryHelperForAlias(helper: string): string | undefined {
  if (helper.includes("Colour")) {
    return helper.replace("Colour", "Color");
  }
  // Style-channel *Ordinal shells re-export *Discrete (#830/#832). Color/fill
  // scaleColorOrdinal / scaleFillOrdinal are distinct primary helpers.
  if ((STYLE_ORDINAL_SCALE_HELPERS as readonly string[]).includes(helper)) {
    return helper.replace(/Ordinal$/, "Discrete");
  }
  return undefined;
}

function buildAlsoExportedAs(primaryHelper: string): readonly string[] {
  const aliases: string[] = [];
  // Colour re-exports for color channel only
  if (primaryHelper.startsWith("scaleColor")) {
    aliases.push(componentNameForScaleHelper(primaryHelper.replace("Color", "Colour")));
  }
  // Ordinal re-exports for discrete style shells
  if (
    primaryHelper.endsWith("Discrete") &&
    (primaryHelper.startsWith("scaleSize") ||
      primaryHelper.startsWith("scaleLinewidth") ||
      primaryHelper.startsWith("scaleAlpha") ||
      primaryHelper.startsWith("scaleShape"))
  ) {
    aliases.push(componentNameForScaleHelper(primaryHelper.replace(/Discrete$/, "Ordinal")));
  }
  return Object.freeze(aliases);
}

function buildEntry(helper: string): ScaleReferenceEntry {
  const family = familyForHelper(helper);
  const aliasOfHelper = primaryHelperForAlias(helper);
  const aes = aestheticFromHelper(helper);
  const meta =
    aliasOfHelper === undefined
      ? classifyHelper(helper, family)
      : classifyHelper(aliasOfHelper, familyForHelper(aliasOfHelper));

  const aesthetics: readonly ScaleAesthetic[] = Object.freeze([aes]);
  const alsoExportedAs: readonly string[] =
    aliasOfHelper === undefined ? buildAlsoExportedAs(helper) : Object.freeze([]);
  const summary =
    aliasOfHelper === undefined
      ? meta.summary
      : helper.includes("Colour")
        ? `${meta.summary} British Colour spelling — same binding as ${componentNameForScaleHelper(aliasOfHelper)}.`
        : `${meta.summary} ggplot2 *Ordinal alias — same binding as ${componentNameForScaleHelper(aliasOfHelper)}.`;

  return Object.freeze({
    helper,
    slug: slugForScaleHelper(helper),
    component: componentNameForScaleHelper(helper),
    family,
    aesthetics,
    scaleType: meta.scaleType,
    ...(meta.transform === undefined ? {} : { transform: meta.transform }),
    ...(meta.temporalKind === undefined ? {} : { temporalKind: meta.temporalKind }),
    summary,
    optionsType: meta.optionsType,
    params: Object.freeze([...meta.params]),
    guide: meta.guide,
    ...(aliasOfHelper === undefined ? {} : { aliasOf: slugForScaleHelper(aliasOfHelper) }),
    alsoExportedAs,
  });
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

export function buildScaleReference(): Readonly<Record<string, ScaleReferenceEntry>> {
  const out: Record<string, ScaleReferenceEntry> = {};
  for (const helper of allScaleHelpers()) {
    const entry = buildEntry(helper);
    if (out[entry.slug] !== undefined) {
      throw new Error(`SCALE_REFERENCE: duplicate slug "${entry.slug}"`);
    }
    out[entry.slug] = entry;
  }
  return Object.freeze(out);
}
