/**
 * Color/fill-family classification for the SCALE_REFERENCE builder
 * (gen-only): continuous, binned, ordinal, manual, identity, transformed,
 * temporal, and gradient/brewer/distiller/fermenter/viridis/hue/grey
 * variants.
 */
import {
  aestheticFromHelper,
  guideFor,
  paramDocsFromSchema,
  withGradientStops,
  withHueGrey,
  withPaletteDirection,
  withValues,
  withViridisOption,
  type HelperMeta,
} from "./scale-reference-classify-support.js";

// ---------------------------------------------------------------------------
// Param key sets per options family (mirrors helper option Pick/Omit types)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Per-helper classification: color / fill
// ---------------------------------------------------------------------------

type ColorFillFamily = "color-fill";

const colorParams = (keys: readonly string[]) => paramDocsFromSchema("ColorScaleSpec", keys);

type ColorHandler = (helper: string) => HelperMeta | undefined;

function classifyPalette(helper: string): HelperMeta | undefined {
  const aes = aestheticFromHelper(helper);

  if (helper.includes("Viridis")) {
    const kind = helper.endsWith("D") ? "ordinal" : helper.endsWith("B") ? "binned" : "sequential";
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
  return undefined;
}

function classifyGradient2(helper: string): HelperMeta | undefined {
  const aes = aestheticFromHelper(helper);

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
  return undefined;
}

function classifyGradient(helper: string): HelperMeta | undefined {
  const aes = aestheticFromHelper(helper);

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
  return undefined;
}

function classifyNamedPalette(helper: string): HelperMeta | undefined {
  const aes = aestheticFromHelper(helper);

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
  return undefined;
}

function classifyBaseColor(helper: string): HelperMeta | undefined {
  const aes = aestheticFromHelper(helper);

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
  return undefined;
}

const COLOR_HANDLERS: ColorHandler[] = [
  classifyPalette,
  classifyGradient2,
  classifyGradient,
  classifyNamedPalette,
  classifyBaseColor,
];

export function classifyColorFillHelper(helper: string, _family: ColorFillFamily): HelperMeta {
  for (const handler of COLOR_HANDLERS) {
    const meta = handler(helper);
    if (meta !== undefined) return meta;
  }
  const stem = helper.replace(
    /^scale(Colour|Color|Fill|X|Y|Size|Linewidth|Alpha|Shape|Linetype|Radius)/,
    "",
  );
  throw new Error(`SCALE_REFERENCE: unhandled color/fill helper "${helper}" (stem ${stem})`);
}
