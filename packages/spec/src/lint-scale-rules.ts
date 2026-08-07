/**
 * Scale-level lint rules: transform-domain-data, fractional-calendar-years.
 * Layer rules: lint-layer-rules.ts. Orchestrator: lint.ts.
 */
import type { Aes, CellValue, PositionScaleSpec } from "./schema.js";
import type { SpecAdvisory } from "./lint.js";
import type { LintFieldOf } from "./lint-layer-rules.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ---------------------------------------------------------------------------
// fractional-calendar-years
// ---------------------------------------------------------------------------

/** Four-digit Gregorian-ish years; excludes tiny indices and huge scientific IDs. */
const YEAR_LIKE_MIN = 1000;
const YEAR_LIKE_MAX = 10_000;
/**
 * Distance from k/12 allowed when classifying a fractional part as a month
 * index. ~0.02 ≈ one week of a year — tight enough to reject day-of-year
 * fractions (i/365) while accepting float noise on m/12 (e.g. 1854.333).
 */
const MONTH_FRAC_TOLERANCE = 0.02;
/** Need several points so a lone mid-year value cannot trip the rule. */
const MIN_YEAR_LIKE_SAMPLES = 4;
/** At least this many non-integer year-likes (months between Januaries). */
const MIN_FRACTIONAL_SAMPLES = 2;
/** Share of year-like values that must sit on the month grid (k/12). */
const MIN_MONTH_GRID_HIT_RATE = 0.7;
/** Share of year-like values that must be non-integer. */
const MIN_FRACTIONAL_RATE = 0.1;

/**
 * True when values look like calendar months encoded as year + month/12 on a
 * linear scale — the Nightingale theme-specimen pitfall that labels axes and
 * Inspect pins as decimals (`1855.9`). Pure integer years stay silent.
 *
 * Exported for unit tests of the heuristic in isolation.
 */
export function looksLikeFractionalCalendarYears(values: readonly CellValue[]): boolean {
  const yearLike: number[] = [];
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value >= YEAR_LIKE_MIN && value < YEAR_LIKE_MAX) yearLike.push(value);
  }
  if (yearLike.length < MIN_YEAR_LIKE_SAMPLES) return false;

  let fractional = 0;
  let monthGridHits = 0;
  for (const value of yearLike) {
    const floor = Math.floor(value);
    const frac = value - floor;
    const isFractional = frac > 1e-9 && frac < 1 - 1e-9;
    if (isFractional) fractional++;

    // Nearest twelfth; k=12 (frac≈1) collapses to the integer edge.
    const k = Math.round(frac * 12);
    const expected = k >= 12 ? 1 : k / 12;
    const dist = Math.abs(frac - expected);
    // Integers always hit month 0; fractions must be within tolerance of k/12.
    if (!isFractional || dist <= MONTH_FRAC_TOLERANCE) monthGridHits++;
  }

  if (fractional < MIN_FRACTIONAL_SAMPLES) return false;
  if (fractional / yearLike.length < MIN_FRACTIONAL_RATE) return false;
  if (monthGridHits / yearLike.length < MIN_MONTH_GRID_HIT_RATE) return false;
  return true;
}

/** First year-like fractional sample for advisory copy, or null. */
function sampleFractionalYear(values: readonly CellValue[]): number | null {
  for (const value of values) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    if (value < YEAR_LIKE_MIN || value >= YEAR_LIKE_MAX) continue;
    const frac = value - Math.floor(value);
    if (frac > 1e-9 && frac < 1 - 1e-9) return value;
  }
  return null;
}

/** Position scale types that already treat the channel as non-linear-year. */
function isNonLinearYearScale(config: PositionScaleSpec | undefined): boolean {
  if (config === undefined) return false;
  return config.type === "time" || config.type === "band";
}

/** Forward-transform domain rule for a position scale, or null if none. */
interface TransformDomain {
  valid(value: number): boolean;
  /** Human label for the message ("log10" | "sqrt"). */
  label: string;
  /** Short description of the valid range ("positive" | "non-negative"). */
  rule: string;
}

/**
 * Resolve the effective forward-transform domain for a position scale, reading
 * the spec BEFORE normalization. Both the authored legacy `type: "log"` and the
 * canonical `transform: "log10" | "sqrt"` are covered; identity/time/untyped
 * scales return null.
 */
function transformDomainOf(config: PositionScaleSpec | undefined): TransformDomain | null {
  if (config === undefined) return null;
  const transform = config.transform ?? (config.type === "log" ? "log10" : undefined);
  if (transform === "log10") {
    return { valid: (v) => v > 0, label: "log10", rule: "positive" };
  }
  if (transform === "sqrt") {
    return { valid: (v) => v >= 0, label: "sqrt", rule: "non-negative" };
  }
  return null;
}

/** Count numeric values inside/outside a transform domain (non-numbers ignored). */
function countTransformDomain(
  values: readonly unknown[],
  domain: TransformDomain,
): readonly [inDomain: number, outOfDomain: number] {
  let inDomain = 0;
  let outOfDomain = 0;
  for (const v of values) {
    if (typeof v !== "number") continue;
    if (domain.valid(v)) inDomain++;
    else outOfDomain++;
  }
  return [inDomain, outOfDomain];
}

/** Scale-scoped advisories for one lintSpec pass. */
export function collectScaleLintAdvisories(input: {
  layers: unknown[];
  scales: Record<string, unknown> | undefined;
  fieldOf: LintFieldOf;
}): SpecAdvisory[] {
  const { layers, scales, fieldOf } = input;
  const advisories: SpecAdvisory[] = [];

  // --- transform-domain-data (scale-level, once per axis) ---------------------
  // Detect the effective forward-transform domain BEFORE normalization: an
  // authored `type: "log"` (canonicalizes to transform: "log10") and a
  // canonical `transform: "log10" | "sqrt"` are all handled here. log10 rejects
  // values <= 0; sqrt rejects values < 0. The advisory fires only on MIXED data
  // (some in-domain, some out) — all-invalid is the pipeline's error/warning.
  //
  // Multi-layer charts often share the same mapped field (plot aes or repeated
  // layer aes). Memoize [inDomain, outOfDomain] per field name for this axis so
  // a shared column is scanned once (O(n)), not once per layer (O(L·n)).
  for (const axis of ["x", "y"] as const) {
    const raw = scales?.[axis];
    // Schema-invalid scale entries must not throw — lint never blocks.
    if (raw !== undefined && !isRecord(raw)) continue;
    const config = raw as PositionScaleSpec | undefined;
    const domain = transformDomainOf(config);
    if (domain === null) continue;
    const fieldDomainCounts = new Map<string, readonly [inDomain: number, outOfDomain: number]>();
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!isRecord(layer)) continue;
      const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
      const use = fieldOf(layerAes, axis);
      const values = use?.info.values;
      if (use === null || values === null || values === undefined) continue;
      let counts = fieldDomainCounts.get(use.field);
      if (counts === undefined) {
        counts = countTransformDomain(values, domain);
        fieldDomainCounts.set(use.field, counts);
      }
      const [inDomain, outOfDomain] = counts;
      if (inDomain > 0 && outOfDomain > 0) {
        advisories.push({
          code: "transform-domain-data",
          path: `/scales/${axis}`,
          message: `scales.${axis} is a ${domain.label} scale, but field "${use.field}" has ${outOfDomain} value(s) outside its ${domain.rule} domain alongside ${inDomain} valid — those rows will be silently dropped before stats.`,
          suggestion: {
            description: `Filter the out-of-domain rows deliberately, or use an identity/linear scale if ${domain.rule} values are meaningful.`,
          },
        });
        break; // one advisory per axis is enough
      }
    }
  }

  // --- fractional-calendar-years (once per axis) -----------------------------
  // Monthly series re-encoded as year + month/12 and plotted on a default or
  // explicit linear scale. Linear defaultTickFormat then prints 1855.9; Inspect
  // pins echo the same. Time/band scales are out of scope (different contract).
  //
  // Memoize the look-alike verdict per field so multi-layer charts scan once.
  for (const axis of ["x", "y"] as const) {
    const raw = scales?.[axis];
    if (raw !== undefined && !isRecord(raw)) continue;
    const config = raw as PositionScaleSpec | undefined;
    if (isNonLinearYearScale(config)) continue;

    const fieldVerdict = new Map<string, boolean>();
    let fired = false;
    for (let i = 0; i < layers.length && !fired; i++) {
      const layer = layers[i];
      if (!isRecord(layer)) continue;
      const layerAes = isRecord(layer["aes"]) ? (layer["aes"] as Aes) : undefined;
      const use = fieldOf(layerAes, axis);
      const values = use?.info.values;
      if (use === null || values === null || values === undefined) continue;
      // Only quantitative columns; temporal/string years are a different path.
      if (use.info.type !== null && use.info.type !== "quantitative") continue;

      let hit = fieldVerdict.get(use.field);
      if (hit === undefined) {
        hit = looksLikeFractionalCalendarYears(values);
        fieldVerdict.set(use.field, hit);
      }
      if (!hit) continue;

      const sample = sampleFractionalYear(values);
      const sampleText =
        sample === null ? "year + month/12" : String(Math.round(sample * 1000) / 1000);
      advisories.push({
        code: "fractional-calendar-years",
        path: `/aes/${axis}`,
        message: `Field "${use.field}" on ${axis} looks like calendar months encoded as fractional years (e.g. ${sampleText}) on a linear scale — tick labels and Inspect pins will show decimals like 1855.9 instead of months.`,
        suggestion: {
          description:
            'Store ISO year-month or date strings ("1854-04" / "1854-04-01") and use a time scale so labels read as calendar months.',
          example: { scales: { [axis]: { type: "time", labels: "%b %Y" } } },
        },
      });
      fired = true;
    }
  }

  return advisories;
}
