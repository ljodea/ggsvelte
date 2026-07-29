/**
 * SCALE_REFERENCE builder (SpecDeclarations + capabilities). Gen-only:
 * `scripts/gen-reference-catalogs.ts`. Runtime uses generated/scale-reference-data.ts.
 */
import {
  SCALE_CAPABILITIES,
  STYLE_ORDINAL_SCALE_HELPERS,
  scaleCapabilityCamelHelpers,
  type ScaleCapability,
} from "./capabilities.js";
import { SpecDeclarations } from "./schema-declarations.js";

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

// ---------------------------------------------------------------------------
// Schema walkers (param docs)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function descriptionOf(node: unknown): string {
  if (!isRecord(node)) return "";
  const d = node["description"];
  return typeof d === "string" ? d : "";
}

function typeSummaryOf(node: unknown, depth = 0): string {
  if (!isRecord(node) || depth > 8) return "unknown";
  const ref = node["$ref"];
  if (typeof ref === "string") return ref;
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
  if (type === "array") {
    const items = node["items"];
    return `Array<${typeSummaryOf(items, depth + 1)}>`;
  }
  if (type === "object") return "object";
  if (Array.isArray(type)) {
    return type.filter((t) => t !== "null").join(" | ") || "unknown";
  }
  return "unknown";
}

function propertiesOf(declName: keyof typeof SpecDeclarations): Record<string, unknown> {
  const schema: unknown = SpecDeclarations[declName];
  if (!isRecord(schema)) {
    throw new Error(`SCALE_REFERENCE: SpecDeclarations.${declName} is not an object`);
  }
  // Intersect schemas put properties on allOf[0].properties
  const direct = schema["properties"];
  if (isRecord(direct)) return direct;
  const allOf = schema["allOf"];
  if (Array.isArray(allOf)) {
    for (const branch of allOf) {
      if (isRecord(branch) && isRecord(branch["properties"])) {
        return branch["properties"];
      }
    }
  }
  throw new Error(`SCALE_REFERENCE: SpecDeclarations.${declName} has no properties`);
}

/** Fallback prose when a schema node has no description (shared style fields). */
const PARAM_DESCRIPTION_FALLBACKS: Readonly<Record<string, string>> = Object.freeze({
  domain:
    "Explicit semantic domain. Continuous scales use [min, max]; ordinal uses ordered values.",
  domainMode:
    'Ordinal domain stability: "grow" (default) preserves assignments across filters; "data" rebuilds from current data.',
  breaks: "Explicit reference ticks or bin boundaries in data units.",
  range: "Explicit output range for the mapped aesthetic.",
  reverse: "Reverse the scale's output direction. Default false.",
  oob: 'Out-of-bounds policy for values outside an explicit domain: "censor" (default) or "squish".',
  naValue: "Replacement for missing/null source values.",
  unknownValue: "Replacement for invalid, out-of-domain, or unmapped values.",
  onExhaust: 'Ordinal palette exhaustion policy: "cycle" (default) with a warning, or "error".',
  labels: "Guide label format string (numeric or temporal).",
  guide: "Guide presentation override (legend, colorbar, colorsteps, or none).",
  transform: 'Pre-training quantitative transform: "identity" (default), "log10", or "sqrt".',
  scheme: "Named color scheme (categorical or sequential family).",
});

function paramDocsFromSchema(
  declName: keyof typeof SpecDeclarations,
  keys: readonly string[],
): ScaleParamDoc[] {
  const props = propertiesOf(declName);
  const docs: ScaleParamDoc[] = [];
  for (const name of keys) {
    const prop = props[name];
    if (prop === undefined) {
      throw new Error(`SCALE_REFERENCE: ${declName} missing property "${name}"`);
    }
    const fromSchema = descriptionOf(prop).trim();
    const description =
      fromSchema === ""
        ? (PARAM_DESCRIPTION_FALLBACKS[name] ?? `Authoring option \`${name}\` for this scale.`)
        : fromSchema;
    docs.push({
      name,
      description,
      typeSummary: typeSummaryOf(prop),
      required: false,
    });
  }
  return docs;
}

function sugarParam(
  name: string,
  typeSummary: string,
  description: string,
  required = false,
): ScaleParamDoc {
  return { name, typeSummary, description, required };
}

// ---------------------------------------------------------------------------
// Param key sets per options family (mirrors helper option Pick/Omit types)
// ---------------------------------------------------------------------------

const POSITION_CONTINUOUS_KEYS = [
  "domain",
  "nice",
  "zero",
  "reverse",
  "breaks",
  "labels",
  "expand",
  "oob",
  "naValue",
  "minorBreaks",
  "transform",
  "guide",
] as const;

const POSITION_TRANSFORMED_KEYS = POSITION_CONTINUOUS_KEYS.filter((k) => k !== "transform");

const POSITION_DISCRETE_KEYS = [
  "domain",
  "reverse",
  "breaks",
  "labels",
  "expand",
  "naValue",
  "guide",
] as const;

const POSITION_TEMPORAL_KEYS = [
  "domain",
  "nice",
  "reverse",
  "breaks",
  "labels",
  "expand",
  "oob",
  "naValue",
  "minorBreaks",
  "parse",
  "parseFailure",
  "timezone",
  "disambiguation",
  "dateBreaks",
  "dateMinorBreaks",
  "dateLabels",
  "locale",
  "weekStart",
  "guide",
] as const;

const COLOR_SEQUENTIAL_KEYS = [
  "domain",
  "breaks",
  "range",
  "scheme",
  "reverse",
  "transform",
  "oob",
  "naValue",
  "unknownValue",
  "labels",
  "guide",
] as const;

const COLOR_TRANSFORMED_KEYS = [
  "domain",
  "breaks",
  "range",
  "scheme",
  "reverse",
  "oob",
  "naValue",
  "unknownValue",
  "labels",
  "guide",
] as const;

const COLOR_DISCRETE_KEYS = [
  "domain",
  "domainMode",
  "range",
  "scheme",
  "reverse",
  "naValue",
  "unknownValue",
  "onExhaust",
  "guide",
] as const;

const COLOR_MANUAL_KEYS = ["domain", "naValue", "unknownValue", "guide"] as const;
const COLOR_IDENTITY_KEYS = ["naValue", "unknownValue", "guide"] as const;
const COLOR_TEMPORAL_KEYS = [
  "domain",
  "breaks",
  "range",
  "scheme",
  "reverse",
  "oob",
  "naValue",
  "unknownValue",
  "labels",
  "guide",
  "parse",
  "parseFailure",
  "timezone",
  "disambiguation",
] as const;

const STYLE_SEQUENTIAL_KEYS = [
  "domain",
  "breaks",
  "range",
  "reverse",
  "oob",
  "naValue",
  "unknownValue",
  "labels",
  "guide",
] as const;

const STYLE_DISCRETE_KEYS = [
  "domain",
  "domainMode",
  "range",
  "reverse",
  "naValue",
  "unknownValue",
  "onExhaust",
  "guide",
] as const;

const STYLE_MANUAL_KEYS = ["domain", "naValue", "unknownValue", "guide"] as const;
const STYLE_IDENTITY_KEYS = ["naValue", "unknownValue", "guide"] as const;

const FINITE_DISCRETE_KEYS = [
  "domain",
  "domainMode",
  "range",
  "reverse",
  "naValue",
  "unknownValue",
  "onExhaust",
  "guide",
] as const;

const FINITE_BINNED_KEYS = [
  "domain",
  "breaks",
  "range",
  "reverse",
  "naValue",
  "unknownValue",
  "labels",
  "guide",
] as const;

// ---------------------------------------------------------------------------
// Per-helper classification
// ---------------------------------------------------------------------------

interface HelperMeta {
  optionsType: string;
  scaleType: string;
  transform?: "log10" | "sqrt";
  temporalKind?: string;
  params: readonly ScaleParamDoc[];
  guide: string;
  summary: string;
}

function aestheticFromHelper(helper: string): ScaleAesthetic {
  if (helper.startsWith("scaleX")) return "x";
  if (helper.startsWith("scaleY")) return "y";
  if (helper.startsWith("scaleColor") || helper.startsWith("scaleColour")) return "color";
  if (helper.startsWith("scaleFill")) return "fill";
  if (helper.startsWith("scaleSize") || helper === "scaleRadius") return "size";
  if (helper.startsWith("scaleLinewidth")) return "linewidth";
  if (helper.startsWith("scaleAlpha")) return "alpha";
  if (helper.startsWith("scaleShape")) return "shape";
  if (helper.startsWith("scaleLinetype")) return "linetype";
  throw new Error(`SCALE_REFERENCE: cannot derive aesthetic from "${helper}"`);
}

function styleSchemaFor(aes: ScaleAesthetic): keyof typeof SpecDeclarations {
  if (aes === "alpha") return "AlphaScaleSpec";
  if (aes === "shape") return "ShapeScaleSpec";
  if (aes === "linetype") return "LinetypeScaleSpec";
  if (aes === "size" || aes === "linewidth") return "PositiveStyleScaleSpec";
  throw new Error(`SCALE_REFERENCE: no style schema for aesthetic ${aes}`);
}

function guideFor(aes: ScaleAesthetic, scaleType: string): string {
  if (aes === "x" || aes === "y") {
    return 'Axis guide on the position channel (band axis guide when type is band). Set guide to customize ticks/labels or guide: "none" to hide.';
  }
  if (aes === "color" || aes === "fill") {
    if (scaleType === "sequential") {
      return 'Colorbar guide by default for continuous ramps. Use guide helpers or guide: "none" to suppress.';
    }
    if (scaleType === "binned") {
      return 'Colorsteps guide by default for binned color. Use guide helpers or guide: "none" to suppress.';
    }
    return 'Legend guide for discrete/manual/identity color. Set guide: "none" to hide.';
  }
  return 'Legend guide for the mapped style channel. Set guide: "none" to hide.';
}

function withLimits(base: ScaleParamDoc[]): ScaleParamDoc[] {
  return [
    sugarParam(
      "limits",
      "DomainValue[]",
      "Pin the scale to [min, max] in source units (authoring sugar for domain). Supplying both limits and domain throws.",
    ),
    ...base,
  ];
}

function withValues(
  base: ScaleParamDoc[],
  typeSummary: string,
  description: string,
): ScaleParamDoc[] {
  return [...base, sugarParam("values", typeSummary, description, true)];
}

function withPaletteDirection(base: ScaleParamDoc[]): ScaleParamDoc[] {
  return [
    ...base,
    sugarParam(
      "palette",
      "string",
      "Named palette (ColorBrewer / distiller / fermenter family). Maps onto scheme.",
    ),
    sugarParam("direction", "1 | -1", "Palette direction: 1 (default) or -1 (reverse)."),
  ];
}

function withGradientStops(
  base: ScaleParamDoc[],
  kind: "2" | "n" | "steps" | "steps2" | "stepsn",
): ScaleParamDoc[] {
  const extra: ScaleParamDoc[] = [];
  if (kind === "2" || kind === "steps2") {
    extra.push(
      sugarParam("low", "string", "Low-end #rgb/#rrggbb color."),
      sugarParam("mid", "string", "Midpoint #rgb/#rrggbb color."),
      sugarParam("high", "string", "High-end #rgb/#rrggbb color."),
      sugarParam(
        "midpoint",
        "number",
        "Data value mapped to mid (default 0 for diverging helpers).",
      ),
    );
  } else if (kind === "n" || kind === "stepsn") {
    extra.push(
      sugarParam(
        "colours",
        "string[]",
        "Ordered #rgb/#rrggbb stops (British spelling alias of colors).",
      ),
      sugarParam("colors", "string[]", "Ordered #rgb/#rrggbb stops."),
      sugarParam(
        "values",
        "number[]",
        "Optional stop positions in [0, 1] (or data units for some helpers).",
      ),
    );
  } else {
    extra.push(
      sugarParam("low", "string", "Low-end #rgb/#rrggbb color."),
      sugarParam("high", "string", "High-end #rgb/#rrggbb color."),
    );
  }
  return [...base.filter((p) => p.name !== "scheme" && p.name !== "range"), ...extra];
}

function withViridisOption(base: ScaleParamDoc[]): ScaleParamDoc[] {
  return [
    sugarParam(
      "option",
      '"viridis" | "magma" | "plasma" | "inferno" | "cividis" | "turbo"',
      "Viridis family option (default viridis).",
    ),
    ...base.filter((p) => p.name !== "scheme"),
  ];
}

function withHueGrey(base: ScaleParamDoc[], kind: "hue" | "grey"): ScaleParamDoc[] {
  if (kind === "hue") {
    return [
      ...base.filter((p) => p.name !== "scheme" && p.name !== "range"),
      sugarParam("h", "[number, number]", "Hue range in degrees (ggplot2 scale_colour_hue)."),
      sugarParam("c", "number", "Chroma."),
      sugarParam("l", "number", "Luminance."),
      sugarParam("direction", "1 | -1", "Wheel direction."),
    ];
  }
  return [
    ...base.filter((p) => p.name !== "scheme" && p.name !== "range"),
    sugarParam("start", "number", "Grey start (0–1)."),
    sugarParam("end", "number", "Grey end (0–1)."),
  ];
}

function classifyHelper(helper: string, family: ScaleFamily): HelperMeta {
  const aes = aestheticFromHelper(helper);
  const stem = helper.replace(
    /^scale(Colour|Color|Fill|X|Y|Size|Linewidth|Alpha|Shape|Linetype|Radius)/,
    "",
  );

  // --- position -----------------------------------------------------------
  if (family === "position-continuous" || family === "position-binned") {
    const posParams = paramDocsFromSchema("PositionScaleSpec", POSITION_CONTINUOUS_KEYS);
    if (helper.includes("Log10")) {
      return {
        optionsType: "TransformedPositionScaleOptions",
        scaleType: "linear",
        transform: "log10",
        params: withLimits(paramDocsFromSchema("PositionScaleSpec", POSITION_TRANSFORMED_KEYS)),
        guide: guideFor(aes, "linear"),
        summary: `Base-10 log ${aes} position scale (pre-stat log10 transform on a linear scale).`,
      };
    }
    if (helper.includes("Sqrt")) {
      return {
        optionsType: "TransformedPositionScaleOptions",
        scaleType: "linear",
        transform: "sqrt",
        params: withLimits(paramDocsFromSchema("PositionScaleSpec", POSITION_TRANSFORMED_KEYS)),
        guide: guideFor(aes, "linear"),
        summary: `Square-root ${aes} position scale (pre-stat sqrt transform on a linear scale).`,
      };
    }
    if (helper.includes("Reverse")) {
      return {
        optionsType: 'Omit<ContinuousPositionScaleOptions, "transform" | "reverse">',
        scaleType: "linear",
        params: withLimits(
          paramDocsFromSchema(
            "PositionScaleSpec",
            POSITION_CONTINUOUS_KEYS.filter((k) => k !== "transform" && k !== "reverse"),
          ),
        ),
        guide: guideFor(aes, "linear"),
        summary: `Continuous ${aes} position scale with reverse: true (output direction flipped).`,
      };
    }
    if (family === "position-binned" || helper.includes("Binned")) {
      return {
        optionsType: "ContinuousPositionScaleOptions",
        scaleType: "binned",
        params: withLimits(posParams),
        guide: guideFor(aes, "binned"),
        summary: `Binned ${aes} position scale: quantitative values map to ordered bins (breaks are bin boundaries).`,
      };
    }
    return {
      optionsType: "ContinuousPositionScaleOptions",
      scaleType: "linear",
      params: withLimits(posParams),
      guide: guideFor(aes, "linear"),
      summary: `Continuous linear ${aes} position scale (default numeric family).`,
    };
  }

  if (family === "position-temporal") {
    let temporalKind = "date";
    if (helper.includes("Datetime")) temporalKind = "datetime";
    else if (helper.includes("Time") && !helper.includes("Date")) temporalKind = "time";
    else if (helper.includes("MonthDay")) temporalKind = "monthDay";
    const label =
      temporalKind === "monthDay"
        ? "month-day (year collapsed)"
        : temporalKind === "time"
          ? "time-of-day"
          : temporalKind;
    return {
      optionsType: "TemporalScaleOptions",
      scaleType: "time",
      temporalKind,
      params: paramDocsFromSchema("PositionScaleSpec", POSITION_TEMPORAL_KEYS),
      guide: guideFor(aes, "time"),
      summary: `Temporal ${aes} position scale (${label}).`,
    };
  }

  if (family === "position-discrete") {
    return {
      optionsType: "DiscretePositionScaleOptions",
      scaleType: "band",
      params: paramDocsFromSchema("PositionScaleSpec", POSITION_DISCRETE_KEYS),
      guide: guideFor(aes, "band"),
      summary: `Discrete (band) ${aes} position scale for categories.`,
    };
  }

  // --- color / fill -------------------------------------------------------
  if (family === "color-fill") {
    const colorParams = (keys: readonly string[]) => paramDocsFromSchema("ColorScaleSpec", keys);

    if (helper.includes("Viridis")) {
      const kind = helper.endsWith("D")
        ? "ordinal"
        : helper.endsWith("B")
          ? "binned"
          : "sequential";
      const label =
        kind === "ordinal"
          ? "discrete (viridis_d)"
          : kind === "binned"
            ? "binned (viridis_b)"
            : "continuous (viridis_c)";
      return {
        optionsType: "ViridisScaleOptions",
        scaleType: kind,
        params: withViridisOption(colorParams(COLOR_SEQUENTIAL_KEYS.filter((k) => k !== "scheme"))),
        guide: guideFor(aes, kind),
        summary: `Viridis-family ${aes} scale — ${label}.`,
      };
    }
    if (helper.includes("Brewer")) {
      return {
        optionsType: "ColorBrewerScaleOptions",
        scaleType: "ordinal",
        params: withPaletteDirection(colorParams(COLOR_DISCRETE_KEYS)),
        guide: guideFor(aes, "ordinal"),
        summary: `ColorBrewer qualitative ${aes} scale (discrete categories).`,
      };
    }
    if (helper.includes("Distiller")) {
      return {
        optionsType: "ColorDistillerScaleOptions",
        scaleType: "sequential",
        params: withPaletteDirection(colorParams(COLOR_SEQUENTIAL_KEYS)),
        guide: guideFor(aes, "sequential"),
        summary: `ColorBrewer sequential/diverging ${aes} ramp (distiller).`,
      };
    }
    if (helper.includes("Fermenter")) {
      return {
        optionsType: "ColorFermenterScaleOptions",
        scaleType: "binned",
        params: withPaletteDirection(colorParams(COLOR_SEQUENTIAL_KEYS)),
        guide: guideFor(aes, "binned"),
        summary: `ColorBrewer binned ${aes} steps (fermenter).`,
      };
    }
    if (helper.includes("Gradient2") || helper.includes("Steps2")) {
      const binned = helper.includes("Steps");
      return {
        optionsType: binned ? "Steps2ScaleOptions" : "Gradient2ScaleOptions",
        scaleType: binned ? "binned" : "sequential",
        params: withGradientStops(colorParams(COLOR_SEQUENTIAL_KEYS), binned ? "steps2" : "2"),
        guide: guideFor(aes, binned ? "binned" : "sequential"),
        summary: binned
          ? `Three-stop diverging binned ${aes} steps (low/mid/high).`
          : `Three-stop diverging continuous ${aes} gradient (low/mid/high).`,
      };
    }
    if (helper.includes("Gradientn") || helper.includes("Stepsn")) {
      const binned = helper.includes("Steps");
      return {
        optionsType: binned ? "StepsnScaleOptions" : "GradientnScaleOptions",
        scaleType: binned ? "binned" : "sequential",
        params: withGradientStops(colorParams(COLOR_SEQUENTIAL_KEYS), binned ? "stepsn" : "n"),
        guide: guideFor(aes, binned ? "binned" : "sequential"),
        summary: binned
          ? `N-stop binned ${aes} steps from an ordered color list.`
          : `N-stop continuous ${aes} gradient from an ordered color list.`,
      };
    }
    if (helper.includes("Gradient") || helper.endsWith("Steps")) {
      const binned = helper.endsWith("Steps");
      return {
        optionsType: binned ? "StepsScaleOptions" : "GradientScaleOptions",
        scaleType: binned ? "binned" : "sequential",
        params: withGradientStops(colorParams(COLOR_SEQUENTIAL_KEYS), binned ? "steps" : "steps"),
        guide: guideFor(aes, binned ? "binned" : "sequential"),
        summary: binned
          ? `Two-stop binned ${aes} steps (low/high).`
          : `Two-stop continuous ${aes} gradient (low/high).`,
      };
    }
    if (helper.includes("Hue")) {
      return {
        optionsType: "HueScaleOptions",
        scaleType: "ordinal",
        params: withHueGrey(colorParams(COLOR_DISCRETE_KEYS), "hue"),
        guide: guideFor(aes, "ordinal"),
        summary: `Evenly spaced hue ${aes} palette for discrete categories.`,
      };
    }
    if (helper.includes("Grey") || helper.includes("Gray")) {
      return {
        optionsType: "GreyScaleOptions",
        scaleType: "ordinal",
        params: withHueGrey(colorParams(COLOR_DISCRETE_KEYS), "grey"),
        guide: guideFor(aes, "ordinal"),
        summary: `Grey ramp ${aes} palette for discrete categories.`,
      };
    }
    if (helper.includes("Ordinal")) {
      return {
        optionsType: "OrdinalColorScaleOptions",
        scaleType: "ordinal",
        params: colorParams(COLOR_DISCRETE_KEYS),
        guide: guideFor(aes, "ordinal"),
        summary: `Explicit ordinal ${aes} scale (categories → colors).`,
      };
    }
    if (helper.includes("Log10")) {
      return {
        optionsType: "TransformedColorScaleOptions",
        scaleType: "sequential",
        transform: "log10",
        params: colorParams(COLOR_TRANSFORMED_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Sequential ${aes} scale with log10 pre-training transform.`,
      };
    }
    if (helper.includes("Sqrt")) {
      return {
        optionsType: "TransformedColorScaleOptions",
        scaleType: "sequential",
        transform: "sqrt",
        params: colorParams(COLOR_TRANSFORMED_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Sequential ${aes} scale with sqrt pre-training transform.`,
      };
    }
    if (helper.includes("Datetime")) {
      return {
        optionsType: "TemporalColorScaleOptions",
        scaleType: "sequential",
        temporalKind: "datetime",
        params: colorParams(COLOR_TEMPORAL_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Sequential ${aes} scale trained on datetime values.`,
      };
    }
    if (helper.includes("Date")) {
      return {
        optionsType: "TemporalColorScaleOptions",
        scaleType: "sequential",
        temporalKind: "date",
        params: colorParams(COLOR_TEMPORAL_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Sequential ${aes} scale trained on calendar dates.`,
      };
    }
    if (helper.includes("Manual")) {
      return {
        optionsType: "ManualColorScaleOptions",
        scaleType: "manual",
        params: withValues(
          colorParams(COLOR_MANUAL_KEYS),
          "string[]",
          "Colors paired positionally with the explicit or trained domain (required).",
        ),
        guide: guideFor(aes, "manual"),
        summary: `Manual ${aes} mapping: domain values paired with explicit colors.`,
      };
    }
    if (helper.includes("Identity")) {
      return {
        optionsType: "IdentityColorScaleOptions",
        scaleType: "identity",
        params: colorParams(COLOR_IDENTITY_KEYS),
        guide: guideFor(aes, "identity"),
        summary: `Identity ${aes} scale: source values are validated #rgb/#rrggbb colors used as-is.`,
      };
    }
    if (helper.includes("Binned")) {
      return {
        optionsType: "BinnedColorScaleOptions",
        scaleType: "binned",
        params: colorParams(COLOR_SEQUENTIAL_KEYS),
        guide: guideFor(aes, "binned"),
        summary: `Binned ${aes} scale: continuous values → ordered color steps.`,
      };
    }
    if (helper.includes("Discrete")) {
      return {
        optionsType: "DiscreteColorScaleOptions",
        scaleType: "ordinal",
        params: colorParams(COLOR_DISCRETE_KEYS),
        guide: guideFor(aes, "ordinal"),
        summary: `Discrete ${aes} scale for categorical data (default ordinal family).`,
      };
    }
    if (helper.includes("Continuous")) {
      return {
        optionsType: "SequentialColorScaleOptions",
        scaleType: "sequential",
        params: colorParams(COLOR_SEQUENTIAL_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Continuous sequential ${aes} scale (default continuous color family).`,
      };
    }
    throw new Error(`SCALE_REFERENCE: unhandled color/fill helper "${helper}" (stem ${stem})`);
  }

  // --- numeric style ------------------------------------------------------
  if (family === "numeric-style") {
    const decl = styleSchemaFor(aes);
    if (helper === "scaleSizeArea" || helper === "scaleSizeBinnedArea") {
      const binned = helper.includes("Binned");
      return {
        optionsType: "SizeAreaScaleOptions",
        scaleType: binned ? "binned" : "sequential",
        params: [
          ...paramDocsFromSchema(decl, STYLE_SEQUENTIAL_KEYS),
          sugarParam(
            "maxSize",
            "number",
            "Maximum area-mapped size (ggplot2 scale_size_area max_size).",
          ),
        ],
        guide: guideFor(aes, binned ? "binned" : "sequential"),
        summary: binned
          ? "Binned size scale with area mapping (zero maps to zero area)."
          : "Continuous size scale with area mapping (zero maps to zero area).",
      };
    }
    if (helper === "scaleRadius") {
      return {
        optionsType: "SequentialStyleScaleOptions",
        scaleType: "sequential",
        params: paramDocsFromSchema(decl, STYLE_SEQUENTIAL_KEYS),
        guide: guideFor("size", "sequential"),
        summary: "Continuous size scale with radius (linear) mapping instead of area.",
      };
    }
    if (helper.includes("Discrete") || helper.includes("Ordinal")) {
      return {
        optionsType: "DiscreteNumericStyleScaleOptions",
        scaleType: "ordinal",
        params: paramDocsFromSchema(decl, STYLE_DISCRETE_KEYS),
        guide: guideFor(aes, "ordinal"),
        summary: `Discrete ${aes} scale for categories (ordinal).`,
      };
    }
    if (helper.includes("Manual")) {
      return {
        optionsType: "ManualNumericStyleScaleOptions",
        scaleType: "manual",
        params: withValues(
          paramDocsFromSchema(decl, STYLE_MANUAL_KEYS),
          "number[]",
          "Numeric range values paired with domain (required).",
        ),
        guide: guideFor(aes, "manual"),
        summary: `Manual ${aes} mapping: domain values paired with explicit numbers.`,
      };
    }
    if (helper.includes("Identity")) {
      return {
        optionsType: "IdentityNumericStyleScaleOptions",
        scaleType: "identity",
        params: paramDocsFromSchema(decl, STYLE_IDENTITY_KEYS),
        guide: guideFor(aes, "identity"),
        summary: `Identity ${aes} scale: source numbers used as mapped style values.`,
      };
    }
    if (helper.includes("Datetime")) {
      return {
        optionsType: "TemporalNumericStyleScaleOptions",
        scaleType: "sequential",
        temporalKind: "datetime",
        params: paramDocsFromSchema(decl, STYLE_SEQUENTIAL_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Sequential ${aes} scale trained on datetime values.`,
      };
    }
    if (helper.includes("Date")) {
      return {
        optionsType: "TemporalNumericStyleScaleOptions",
        scaleType: "sequential",
        temporalKind: "date",
        params: paramDocsFromSchema(decl, STYLE_SEQUENTIAL_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Sequential ${aes} scale trained on calendar dates.`,
      };
    }
    if (helper.includes("Binned")) {
      return {
        optionsType: "SequentialStyleScaleOptions",
        scaleType: "binned",
        params: paramDocsFromSchema(decl, STYLE_SEQUENTIAL_KEYS),
        guide: guideFor(aes, "binned"),
        summary: `Binned ${aes} scale: continuous values → stepped numeric style.`,
      };
    }
    if (helper.includes("Continuous")) {
      return {
        optionsType: "SequentialStyleScaleOptions",
        scaleType: "sequential",
        params: paramDocsFromSchema(decl, STYLE_SEQUENTIAL_KEYS),
        guide: guideFor(aes, "sequential"),
        summary: `Continuous sequential ${aes} scale.`,
      };
    }
    throw new Error(`SCALE_REFERENCE: unhandled numeric-style helper "${helper}"`);
  }

  // --- finite style -------------------------------------------------------
  if (family === "finite-style") {
    const decl = styleSchemaFor(aes);
    const output =
      aes === "shape" ? "PointShapeName" : aes === "linetype" ? "LinetypeName" : "string";
    if (helper.includes("Discrete") || helper.includes("Ordinal")) {
      return {
        optionsType: `DiscreteFiniteStyleScaleOptions<${output}>`,
        scaleType: "ordinal",
        params: paramDocsFromSchema(decl, FINITE_DISCRETE_KEYS),
        guide: guideFor(aes, "ordinal"),
        summary: `Discrete ${aes} scale for categories (named symbols).`,
      };
    }
    if (helper.includes("Binned")) {
      return {
        optionsType: `BinnedFiniteStyleScaleOptions<${output}>`,
        scaleType: "binned",
        params: paramDocsFromSchema(decl, FINITE_BINNED_KEYS),
        guide: guideFor(aes, "binned"),
        summary: `Binned ${aes} scale: continuous values → finite named symbols.`,
      };
    }
    if (helper.includes("Manual")) {
      return {
        optionsType: `ManualFiniteStyleScaleOptions<${output}>`,
        scaleType: "manual",
        params: withValues(
          paramDocsFromSchema(decl, STYLE_MANUAL_KEYS),
          `${output}[]`,
          "Named symbols paired with domain (required).",
        ),
        guide: guideFor(aes, "manual"),
        summary: `Manual ${aes} mapping: domain values paired with named symbols.`,
      };
    }
    if (helper.includes("Identity")) {
      return {
        optionsType: `IdentityFiniteStyleScaleOptions<${output}>`,
        scaleType: "identity",
        params: paramDocsFromSchema(decl, STYLE_IDENTITY_KEYS),
        guide: guideFor(aes, "identity"),
        summary: `Identity ${aes} scale: source names used as mapped symbols.`,
      };
    }
    throw new Error(`SCALE_REFERENCE: unhandled finite-style helper "${helper}"`);
  }

  throw new Error(`SCALE_REFERENCE: unknown family ${String(family)} for helper "${helper}"`);
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
