/**
 * Style-family classification for the SCALE_REFERENCE builder (gen-only):
 * numeric style channels (size/linewidth/alpha) and finite style channels
 * (shape/linetype).
 */
import {
  aestheticFromHelper,
  guideFor,
  paramDocsFromSchema,
  styleSchemaFor,
  sugarParam,
  withValues,
  type HelperMeta,
} from "./scale-reference-classify-support.js";

// ---------------------------------------------------------------------------
// Param key sets per options family (mirrors helper option Pick/Omit types)
// ---------------------------------------------------------------------------

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
// Per-helper classification: numeric style / finite style
// ---------------------------------------------------------------------------

type StyleFamily = "numeric-style" | "finite-style";

export function classifyStyleHelper(helper: string, family: StyleFamily): HelperMeta {
  return family === "numeric-style"
    ? classifyNumericStyleHelper(helper)
    : classifyFiniteStyleHelper(helper);
}

function classifyNumericStyleHelper(helper: string): HelperMeta {
  const aes = aestheticFromHelper(helper);
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

function classifyFiniteStyleHelper(helper: string): HelperMeta {
  const aes = aestheticFromHelper(helper);
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
