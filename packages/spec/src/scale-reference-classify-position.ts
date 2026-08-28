/**
 * Position-family classification for the SCALE_REFERENCE builder (gen-only):
 * continuous/binned linear, transformed, temporal, and discrete (band) x/y
 * position scales.
 */
import {
  aestheticFromHelper,
  guideFor,
  paramDocsFromSchema,
  withLimits,
  type HelperMeta,
} from "./scale-reference-classify-support.js";

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

// ---------------------------------------------------------------------------
// Per-helper classification: position families
// ---------------------------------------------------------------------------

type PositionFamily =
  | "position-continuous"
  | "position-binned"
  | "position-temporal"
  | "position-discrete";

export function classifyPositionHelper(helper: string, family: PositionFamily): HelperMeta {
  const aes = aestheticFromHelper(helper);

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

  // Remaining position family: discrete (band).
  return {
    optionsType: "DiscretePositionScaleOptions",
    scaleType: "band",
    params: paramDocsFromSchema("PositionScaleSpec", POSITION_DISCRETE_KEYS),
    guide: guideFor(aes, "band"),
    summary: `Discrete (band) ${aes} position scale for categories.`,
  };
}
