/**
 * GUIDE_REFERENCE builder. Gen-only: `scripts/gen-reference-catalogs.ts`.
 * Runtime uses generated/guide-reference-data.ts.
 */
import { SpecDeclarations } from "./schema-declarations.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Static catalog metadata
// ---------------------------------------------------------------------------

const GUIDE_SUMMARIES: Readonly<Record<GuideTypeName, string>> = Object.freeze({
  legend:
    "Discrete legend for one non-position aesthetic: title, placement rank, position, direction, key size, and collision. Default guide for categorical color, fill, size, shape, and other style channels.",
  colorbar:
    "Continuous color ramp for sequential color or fill scales. Shows ticks and labels along a vertical or horizontal bar; incompatible with discrete legends and binned colorsteps.",
  colorsteps:
    "Binned color legend for binned color or fill scales. Step blocks with optional labels; use instead of legend or colorbar when the scale type is binned.",
  axis: "Axis guide for positional aesthetics x and y: title, tick marks, labels, and collision. Not valid on color, fill, or other style channels.",
  none: "Suppress the guide for one aesthetic entirely. Valid on every channel; useful to hide size or shape legends while keeping the mapping.",
});

const GUIDE_COMPONENTS: Readonly<Record<GuideTypeName, string>> = Object.freeze({
  legend: "GuideLegend",
  colorbar: "GuideColorbar",
  colorsteps: "GuideColorsteps",
  axis: "GuideAxis",
  none: "GuideNone",
});

const GUIDE_SCHEMA_TYPES: Readonly<Record<GuideTypeName, string>> = Object.freeze({
  legend: "LegendGuideSpec",
  colorbar: "ColorbarGuideSpec",
  colorsteps: "ColorstepsGuideSpec",
  axis: "AxisGuideSpec",
  none: "NoneGuideSpec",
});

const GUIDE_HELPERS: Readonly<Record<GuideTypeName, { camel: string; snake: string }>> =
  Object.freeze({
    legend: { camel: "guideLegend", snake: "guide_legend" },
    colorbar: { camel: "guideColorbar", snake: "guide_colorbar" },
    colorsteps: { camel: "guideColorsteps", snake: "guide_colorsteps" },
    axis: { camel: "guideAxis", snake: "guide_axis" },
    none: { camel: "guideNone", snake: "guide_none" },
  });

/** Aesthetic keys each guide type may bind (matches guideStructuralErrors). */
const GUIDE_CHANNELS_FOR_TYPE: Readonly<Record<GuideTypeName, readonly GuideChannelName[]>> =
  Object.freeze({
    axis: ["x", "y"],
    legend: ["color", "fill", "size", "linewidth", "alpha", "shape", "linetype"],
    colorbar: ["color", "fill"],
    colorsteps: ["color", "fill"],
    none: [...GUIDE_CHANNELS],
  });

/**
 * Schema props often omit descriptions. Prefer SpecDeclarations text when
 * present; fall back to these authoring notes so every param has prose.
 */
const PARAM_DESCRIPTION_FALLBACKS: Readonly<Record<string, string>> = Object.freeze({
  title: "Optional guide title string (max 256 characters). Omit to use the scale or labs title.",
  order:
    "Integer placement rank among sibling guides (−1024…1024). Lower values sort earlier. Not the plot-wide Legend entry-sort enum.",
  position:
    'Guide placement relative to the panel: "auto", "right", or "bottom". Auto picks a side from available space.',
  direction:
    'Layout of keys or the color ramp: "auto", "vertical", or "horizontal". Bottom placement usually forces horizontal.',
  keySize: "Legend key glyph size in pixels (4…48).",
  collision:
    "How long labels behave when they do not fit: ellipsis, wrap (legend only), preserve (axis), auto (axis), or error.",
  force:
    "When true, keep this guide even if the scale would normally suppress it (for example a single-level discrete scale).",
  showTicks: "When false, hide tick marks on the axis or colorbar.",
  showLabels: "When false, hide tick or step labels on the axis, colorbar, or colorsteps guide.",
  theme:
    "Bounded presentation overrides for this guide block (title/label size, gaps, colorbar size).",
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

function guideParamsDocs(schemaType: string): readonly GuideParamDoc[] {
  if (!(schemaType in SpecDeclarations)) {
    throw new Error(`GUIDE_REFERENCE: SpecDeclarations has no entry "${schemaType}"`);
  }
  const schema = SpecDeclarations[schemaType as keyof typeof SpecDeclarations] as {
    properties?: Record<string, unknown>;
    required?: readonly string[];
  };
  const props = schema.properties;
  if (props === undefined) {
    // NoneGuideSpec is `{ type: "none" }` only — no option props.
    return Object.freeze([]);
  }
  const required = new Set(schema.required ?? []);
  const docs: GuideParamDoc[] = [];
  for (const [name, propSchema] of Object.entries(props)) {
    if (name === "type") continue; // discriminant is fixed by the shell / helper
    const description = descriptionOf(propSchema, name);
    if (description.trim() === "") {
      throw new Error(
        `GUIDE_REFERENCE: ${schemaType}.${name} has no schema description and no fallback`,
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

function buildEntry(name: GuideTypeName): GuideReferenceEntry {
  const helpers = GUIDE_HELPERS[name];
  return Object.freeze({
    name,
    slug: name,
    component: GUIDE_COMPONENTS[name],
    typeLiteral: name,
    schemaType: GUIDE_SCHEMA_TYPES[name],
    helper: helpers.camel,
    helperAlias: helpers.snake,
    summary: GUIDE_SUMMARIES[name],
    channels: GUIDE_CHANNELS_FOR_TYPE[name],
    params: guideParamsDocs(GUIDE_SCHEMA_TYPES[name]),
  });
}

export function buildGuideReference(): Readonly<Record<GuideTypeName, GuideReferenceEntry>> {
  const out = {} as Record<GuideTypeName, GuideReferenceEntry>;
  for (const name of KNOWN_GUIDE_TYPES) {
    out[name] = buildEntry(name);
  }
  return Object.freeze(out);
}
