/**
 * Tick derivation for one layout measurement pass: band (measured + legacy),
 * temporal guides, linear / log10 / sqrt continuous ticks, and explicit breaks.
 */
import { encodeKey } from "../scales/state.js";
import type { CellValue } from "../table.js";
import type { AxisGuidePlan } from "./temporal-guide.js";
import { planTemporalAxis } from "./temporal-guide.js";
import { planBandAxis, type BandAxisPlan } from "./band-guide.js";
import type { TextMeasurer } from "./measure.js";
import {
  defaultLogTickFormat,
  defaultTickFormat,
  linearTicks,
  logTicks,
  tickStep,
} from "./ticks.js";
import { defaultTimeTickFormat, timeTicks } from "./time.js";
import type { BandLayoutDomainContext, Domain, Tick, TickFormatter } from "./layout-types.js";

/**
 * First-occurrence domain index by discrete identity (`encodeKey`, same as
 * trainBand.indexOf). O(D) build, O(1) lookup — replaces O(K·D) findIndex over
 * rawCategories for each explicit break.
 */
export function firstDomainIndexByEncodeKey(
  rawCategories: readonly unknown[],
): (value: unknown) => number {
  const indexByKey = new Map<string, number>();
  for (let index = 0; index < rawCategories.length; index++) {
    const key = encodeKey(rawCategories[index]);
    if (!indexByKey.has(key)) indexByKey.set(key, index);
  }
  return (value: unknown): number => {
    try {
      return indexByKey.get(encodeKey(value)) ?? -1;
    } catch {
      return -1;
    }
  };
}

/** Resolve band tick entries: full domain or break-filtered domainIndex list. */
function resolveBandEntries(
  domain: Extract<Domain, { type: "band" }>,
): { value: string | number; domainIndex: number }[] {
  const rawCategories = domain.rawCategories ?? domain.categories;
  if (domain.breaks === undefined) {
    return domain.categories.map((value, domainIndex) => ({ value, domainIndex }));
  }
  const domainIndexOf = firstDomainIndexByEncodeKey(rawCategories);
  const entries: { value: string | number; domainIndex: number }[] = [];
  for (const value of domain.breaks) {
    const domainIndex = domainIndexOf(value);
    if (domainIndex < 0) continue;
    entries.push({ value, domainIndex });
  }
  return entries;
}

export interface AxisTicks {
  ticks: Tick[];
  step: number;
  empty: boolean;
  guidePlan?: AxisGuidePlan;
  /** Measured band planner: orthogonal (bottom) band height it requires, px. */
  bandLabelBandHeight?: number;
  /** Measured band planner: along-axis overhang past the RIGHT end tick, px. */
  bandAlongOverhang?: number;
  /** Measured band planner: along-axis overhang past the LEFT end tick, px. */
  bandLeftOverhang?: number;
  /** Measured band planner: resolved thinning (1 = every category labeled). */
  bandLabelEvery?: number;
}

export interface DeriveTicksContext {
  orient: "horizontal" | "vertical";
  extentPx: number;
  measurer: TextMeasurer;
  fontSize: number;
  marginCapPx: number;
  orthogonalMarginCapPx?: number;
  /** Tick chrome (tickLength + gap) that layoutPass adds AFTER the label band; the
   *  band planner subtracts it so the band + chrome together honor the margin cap. */
  orthogonalChromePx?: number;
  quantum?: number;
  previousGuidePlan?: AxisGuidePlan;
}

/** Assemble an AxisGuidePlan from a measured band plan (mirrors planBasicAxis). */
function bandGuidePlan(
  plan: BandAxisPlan,
  context: BandLayoutDomainContext,
  rawCategories: readonly unknown[],
): AxisGuidePlan {
  const reverse = context.config.reverse === true;
  return Object.freeze({
    type: "axis" as const,
    id: `axis:${context.aesthetic}:panel:${String(context.panelIndex)}`,
    aesthetic: context.aesthetic,
    panelIndex: context.panelIndex,
    scaleType: "band" as const,
    transform: "identity" as const,
    temporalKind: null,
    domain: Object.freeze(rawCategories.map((value) => value as CellValue)),
    direction: reverse ? ("descending" as const) : ("ascending" as const),
    source: context.config.breaks === undefined ? ("automatic" as const) : ("explicit" as const),
    interval: null,
    locale: null,
    timezone: null,
    ticks: Object.freeze(
      plan.ticks.map((tick) =>
        Object.freeze({
          value: rawCategories[tick.domainIndex] as CellValue,
          label: tick.labeled ? tick.label : "",
          fullLabel: tick.fullLabel,
          kind: "major" as const,
        }),
      ),
    ),
    ...(context.config.breaks !== undefined && {
      sourceBreaks: Object.freeze([...context.config.breaks] as CellValue[]),
    }),
    overlap: plan.overlap,
    marginOverflow: plan.marginOverflow,
    degraded: Object.freeze([...plan.degraded]),
    bandLabelMode: plan.mode,
    bandLabelAngle: plan.angle,
    bandLabelBandHeight: plan.labelBandHeight,
  });
}

function smallestGap(values: readonly number[]): number {
  let gap = 0;
  for (let i = 1; i < values.length; i++) {
    const d = Math.abs(values[i]! - values[i - 1]!);
    if (d > 0 && (gap === 0 || d < gap)) gap = d;
  }
  return gap;
}

export function deriveTicks(
  domain: Domain,
  requestedCount: number,
  format: TickFormatter | undefined,
  labelEvery: number,
  context: DeriveTicksContext,
): AxisTicks {
  if (domain.type === "band") {
    const rawCategories = domain.rawCategories ?? domain.categories;
    // Resolve break-filtered (or full-domain) entries once for both the measured
    // horizontal planner and the legacy vertical path — O(D+K) via encodeKey map.
    const resolved = resolveBandEntries(domain);
    // Measured planner: horizontal band axes with a planning context only (G1).
    // Vertical band (native Y, or categorical-on-Y after coord_flip) falls through
    // to the legacy thin/truncate path.
    if (domain.band !== undefined && context.orient === "horizontal") {
      const guide = domain.band.config.guide;
      const plan = planBandAxis({
        aesthetic: domain.band.aesthetic,
        panelIndex: domain.band.panelIndex,
        categoryCount: domain.categories.length,
        entries: resolved.map(({ value, domainIndex }) => ({
          value,
          label: format ? format(value, NaN) : String(value),
          domainIndex,
        })),
        orient: context.orient,
        extentPx: context.extentPx,
        reverse: domain.band.config.reverse === true,
        measurer: context.measurer,
        fontSize: context.fontSize,
        marginCapPx: context.marginCapPx,
        // Reserve tick chrome: layoutPass adds tickLength+tickLabelGap to the band
        // height and the renderer offsets labels by it, so the label band itself
        // must fit the cap MINUS that chrome or it clips without truncating.
        orthogonalMarginCapPx: Math.max(
          1,
          (context.orthogonalMarginCapPx ?? context.marginCapPx) -
            (context.orthogonalChromePx ?? 0),
        ),
        ...(context.quantum !== undefined && { quantum: context.quantum }),
        previousMode: context.previousGuidePlan?.bandLabelMode ?? null,
        // Author pin from scales.x.guide / scaleXDiscrete({ guide }) (#407).
        ...(guide !== undefined && { config: guide }),
      });
      const ticks: Tick[] = plan.ticks.map((tick) => ({
        value: tick.value,
        label: tick.label,
        fullLabel: tick.fullLabel,
        domainIndex: tick.domainIndex,
        labeled: tick.labeled,
        ...(tick.lines !== undefined && { lines: tick.lines }),
        ...(tick.angle !== undefined && { angle: tick.angle }),
      }));
      return {
        ticks,
        step: NaN,
        empty: plan.ticks.length === 0,
        guidePlan: bandGuidePlan(plan, domain.band, rawCategories),
        bandLabelBandHeight: plan.labelBandHeight,
        bandAlongOverhang: plan.alongOverhang,
        bandLeftOverhang: plan.leftOverhang,
        bandLabelEvery: plan.labelEvery,
      };
    }
    const ticks = resolved.map(({ value, domainIndex }, index) => ({
      value,
      label: format ? format(value, NaN) : String(value),
      domainIndex,
      labeled: index % labelEvery === 0,
    }));
    return { ticks, step: NaN, empty: resolved.length === 0 };
  }
  const { min, max } = domain;
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { ticks: [], step: NaN, empty: true };
  }

  // Explicit breaks override derivation (out-of-domain breaks are dropped).
  if (domain.breaks !== undefined && !(domain.type === "time" && domain.temporal !== undefined)) {
    const values = domain.breaks.filter((v) => Number.isFinite(v) && v >= min && v <= max);
    const step = smallestGap(values);
    const fmt: (v: number) => string = format
      ? (v) => format(v, step)
      : domain.type === "time"
        ? defaultTimeTickFormat
        : domain.type === "linear" && domain.transform === "log10"
          ? defaultLogTickFormat
          : defaultTickFormat(step);
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step,
      empty: false,
    };
  }

  if (domain.type === "time") {
    if (domain.temporal !== undefined) {
      const plan = planTemporalAxis({
        aesthetic: domain.temporal.aesthetic,
        panelIndex: domain.temporal.panelIndex,
        domain: [min, max],
        kind: domain.temporal.kind,
        orient: context.orient,
        extentPx: context.extentPx,
        reverse: domain.temporal.config.reverse === true,
        measurer: context.measurer,
        fontSize: context.fontSize,
        marginCapPx: context.marginCapPx,
        ...(context.orthogonalMarginCapPx !== undefined && {
          orthogonalMarginCapPx: context.orthogonalMarginCapPx,
        }),
        config: domain.temporal.config,
        ...(domain.breaks !== undefined && { breaks: domain.breaks }),
        ...(domain.temporal.sourceBreaks !== undefined && {
          sourceBreaks: domain.temporal.sourceBreaks,
        }),
        ...(context.previousGuidePlan?.interval !== undefined && {
          previousInterval: context.previousGuidePlan.interval,
        }),
      });
      return {
        ticks: plan.ticks.map((tick) => ({
          value: tick.value as number,
          label: tick.label,
          fullLabel: tick.fullLabel,
          kind: tick.kind,
          labeled: tick.kind === "major" && tick.label !== "",
        })),
        step: NaN,
        empty: plan.ticks.length === 0,
        guidePlan: plan,
      };
    }
    const values = timeTicks(min, max, requestedCount).values;
    const fmt: (v: number) => string = format ? (v) => format(v, NaN) : defaultTimeTickFormat;
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step: NaN,
      empty: false,
    };
  }
  // log10: decade-aware ticks selected on the semantic (positive) domain.
  if (domain.transform === "log10") {
    const values = logTicks(min, max, requestedCount);
    const fmt: (v: number) => string = format ? (v) => format(v, NaN) : defaultLogTickFormat;
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step: NaN,
      empty: false,
    };
  }
  // sqrt: select ticks in transformed (sqrt) space, inverse-project to finite
  // semantic labels so spacing is even in pixels.
  if (domain.transform === "sqrt") {
    const lo = min < 0 ? 0 : Math.sqrt(min);
    const transformedTicks = linearTicks(lo, Math.sqrt(max), requestedCount);
    const values = transformedTicks.map((t) => t * t);
    const step = smallestGap(values);
    const fmt: (v: number) => string = format ? (v) => format(v, step) : defaultTickFormat(step);
    return {
      ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
      step,
      empty: values.length === 0,
    };
  }
  const values = linearTicks(min, max, requestedCount);
  const step = min === max ? 0 : tickStep(min, max, requestedCount);
  const fmt: (v: number) => string = format ? (v) => format(v, step) : defaultTickFormat(step);
  return {
    ticks: values.map((v) => ({ value: v, label: fmt(v), labeled: true })),
    step,
    empty: false,
  };
}
