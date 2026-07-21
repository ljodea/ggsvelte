import {
  MAX_TEMPORAL_MAJOR_TICKS,
  MAX_TEMPORAL_MINOR_TICKS,
  MIN_TEMPORAL_LABEL_GAP_PX,
  parseTemporalInterval,
  TemporalIntervalError,
  temporalIntervalTicks,
  type PositionScaleSpec,
  type TemporalInterval,
  type TemporalKind,
} from "@ggsvelte/spec";

import { neighbourOverlap } from "./axis-overlap.js";
import type { BandLabelMode } from "./band-guide.js";
import type { PositionScale } from "../scales/train.js";
import type { CellValue } from "../table.js";
import { formatTemporalTickSequence, formatTime } from "./format.js";
import type { Tick } from "./layout.js";
import type { TextMeasurer } from "./measure.js";

export interface AxisGuideTick {
  value: number | CellValue;
  label: string;
  fullLabel: string;
  kind: "major" | "minor";
}

export interface AxisGuidePlan {
  type: "axis";
  id: string;
  aesthetic: "x" | "y";
  panelIndex: number;
  scaleType: "linear" | "time" | "band";
  /** Pre-stat numeric transform; time/band plans use identity. */
  transform: "identity" | "log10" | "sqrt";
  temporalKind: TemporalKind | null;
  domain: readonly [number, number] | readonly CellValue[];
  direction: "ascending" | "descending";
  source: "automatic" | "interval" | "explicit";
  interval: string | null;
  locale: string | null;
  timezone: string | null;
  ticks: readonly AxisGuideTick[];
  sourceBreaks?: readonly CellValue[];
  overlap: boolean;
  marginOverflow: boolean;
  degraded: readonly string[];
  /** Band label layout (measured horizontal band axes only). */
  bandLabelMode?: BandLabelMode;
  /** Band rotation in degrees (0 | -45 | -90). */
  bandLabelAngle?: number;
}

export type GuidePlan = AxisGuidePlan;

export class TemporalGuideIntervalError extends Error {
  override readonly cause: TemporalIntervalError;

  constructor(
    readonly aesthetic: "x" | "y",
    readonly option: "dateBreaks" | "dateMinorBreaks",
    cause: TemporalIntervalError,
  ) {
    super(cause.message);
    this.name = "TemporalGuideIntervalError";
    this.cause = cause;
  }
}

export function planBasicAxis(input: {
  aesthetic: "x" | "y";
  panelIndex: number;
  scale: PositionScale;
  ticks: readonly Tick[];
  config: PositionScaleSpec | undefined;
}): AxisGuidePlan {
  const values = input.ticks.map((tick, index) =>
    input.scale.type === "band"
      ? tick.domainIndex === undefined
        ? (input.scale.rawDomain[index] as CellValue)
        : (input.scale.rawDomain[tick.domainIndex] as CellValue)
      : (tick.value as number),
  );
  const ticks = input.ticks.map((tick, index) => ({
    value: values[index]!,
    label: tick.labeled ? tick.label : "",
    fullLabel: tick.fullLabel ?? tick.label,
    kind: tick.kind ?? ("major" as const),
  }));
  const source = input.config?.breaks === undefined ? "automatic" : "explicit";
  return Object.freeze({
    type: "axis" as const,
    id: `axis:${input.aesthetic}:panel:${String(input.panelIndex)}`,
    aesthetic: input.aesthetic,
    panelIndex: input.panelIndex,
    scaleType: input.scale.type,
    transform: input.scale.type === "band" ? "identity" : input.scale.transform,
    temporalKind: null,
    domain:
      input.scale.type === "band"
        ? Object.freeze(input.scale.rawDomain.map((value) => value as CellValue))
        : Object.freeze([input.scale.domain[0], input.scale.domain[1]] as const),
    direction: input.config?.reverse === true ? ("descending" as const) : ("ascending" as const),
    source,
    interval: null,
    locale: null,
    timezone: null,
    ticks: Object.freeze(ticks.map((tick) => Object.freeze(tick))),
    ...(input.config?.breaks !== undefined && {
      sourceBreaks: Object.freeze([...input.config.breaks] as CellValue[]),
    }),
    overlap: false,
    marginOverflow: false,
    degraded: Object.freeze([]),
  });
}

export interface TemporalAxisPlanInput {
  aesthetic: "x" | "y";
  panelIndex: number;
  domain: readonly [number, number];
  kind: TemporalKind;
  orient: "horizontal" | "vertical";
  extentPx: number;
  reverse: boolean;
  measurer: TextMeasurer;
  fontSize: number;
  marginCapPx: number;
  /** Cap for the orthogonal label band (bottom for x, top/bottom overhang for y). */
  orthogonalMarginCapPx?: number;
  config: Pick<
    PositionScaleSpec,
    | "dateBreaks"
    | "dateMinorBreaks"
    | "dateLabels"
    | "labels"
    | "locale"
    | "timezone"
    | "weekStart"
    | "disambiguation"
  >;
  /** Numeric semantic epoch-ms breaks converted through the resolved source parser. */
  breaks?: readonly number[];
  sourceBreaks?: readonly CellValue[];
  /** Pass-A automatic interval hint. Author intervals never use this. */
  previousInterval?: string | null;
}

interface CandidateEvaluation {
  interval: TemporalInterval;
  ticks: AxisGuideTick[];
  overlap: boolean;
  marginOverflow: boolean;
  count: number;
  approxMs: number;
}

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30.44 * DAY;
const YEAR = 365.25 * DAY;

const AUTOMATIC_INTERVALS: readonly TemporalInterval[] = [
  ...[1, 2, 5, 10, 20, 50, 100, 200, 500].map((step) => interval("millisecond", step)),
  ...[1, 2, 5, 10, 15, 30].map((step) => interval("second", step)),
  ...[1, 2, 5, 10, 15, 30].map((step) => interval("minute", step)),
  ...[1, 2, 3, 6, 12].map((step) => interval("hour", step)),
  ...[1, 2].map((step) => interval("day", step)),
  ...[1, 2].map((step) => interval("week", step)),
  ...[1, 2, 3, 6].map((step) => interval("month", step)),
  ...[1, 2].map((step) => interval("quarter", step)),
  ...[1, 2, 5, 10, 20, 50, 100, 200, 500, 1_000, 2_000, 5_000].map((step) =>
    interval("year", step),
  ),
];

function interval(unit: TemporalInterval["unit"], step: number): TemporalInterval {
  return { unit, step, key: `${String(step)} ${unit}${step === 1 ? "" : "s"}` };
}

function intervalApproxMs(value: TemporalInterval): number {
  const unit = {
    millisecond: 1,
    second: SECOND,
    minute: MINUTE,
    hour: HOUR,
    day: DAY,
    week: WEEK,
    month: MONTH,
    quarter: 3 * MONTH,
    year: YEAR,
  }[value.unit];
  return unit * value.step;
}

function temporalOptions(input: TemporalAxisPlanInput) {
  return {
    kind: input.kind,
    locale: input.config.locale ?? "en-US",
    timezone: input.kind === "date" ? "UTC" : (input.config.timezone ?? "UTC"),
    weekStart: input.config.weekStart ?? "monday",
    ...(input.config.disambiguation !== undefined && {
      disambiguation: input.config.disambiguation,
    }),
  };
}

function buildTicks(
  values: readonly number[],
  intervalValue: TemporalInterval,
  input: TemporalAxisPlanInput,
): AxisGuideTick[] {
  // Contextual abbreviations depend on sequence order. When the axis is reversed,
  // format in visual order so the leftmost/topmost tick keeps full context, then
  // map labels back onto ascending semantic values.
  const formatOrder = input.reverse ? values.toReversed() : values;
  const formatted = formatTemporalTickSequence(formatOrder, {
    ...temporalOptions(input),
    interval: intervalValue,
    ...(input.config.dateLabels !== undefined && { pattern: input.config.dateLabels }),
  });
  const labels = input.reverse ? formatted.toReversed() : formatted;
  if (input.config.dateLabels === undefined && input.config.labels !== undefined) {
    for (let index = 0; index < labels.length; index++) {
      labels[index] = {
        ...labels[index]!,
        label: formatTime(values[index]!, input.config.labels),
      };
    }
  }
  return values.map((value, index) => ({
    value,
    label: labels[index]!.label,
    fullLabel: labels[index]!.fullLabel,
    kind: "major" as const,
  }));
}

function evaluateTicks(
  ticks: readonly AxisGuideTick[],
  input: TemporalAxisPlanInput,
): { overlap: boolean; marginOverflow: boolean } {
  if (ticks.length === 0) return { overlap: false, marginOverflow: false };
  const [min, max] = input.domain;
  const span = max - min;
  const projected = ticks
    .map((tick) => {
      const value = tick.value as number;
      const fraction = span === 0 ? 0.5 : (value - min) / span;
      const pos = (input.reverse ? 1 - fraction : fraction) * input.extentPx;
      return {
        pos,
        width: input.measurer.measureWidth(tick.label, input.fontSize),
        height: input.measurer.measureHeight(input.fontSize),
      };
    })
    .toSorted((left, right) => left.pos - right.pos);

  const overlap = neighbourOverlap(
    projected.map((tick) => ({
      pos: tick.pos,
      half: input.orient === "horizontal" ? tick.width / 2 : tick.height / 2,
    })),
    MIN_TEMPORAL_LABEL_GAP_PX,
  );
  // Layout reserves tickLength + tickLabelGap (defaults 6 + 3) in addition to the
  // label extent. Match that chrome so near-cap labels still diagnose overflow.
  const tickChromePx = 6 + 3;
  const orthogonalCap = input.orthogonalMarginCapPx ?? input.marginCapPx;
  const marginOverflow = projected.some((tick) =>
    input.orient === "horizontal"
      ? tick.width / 2 > input.marginCapPx || tick.height + tickChromePx > orthogonalCap
      : tick.width + tickChromePx > input.marginCapPx || tick.height / 2 > orthogonalCap,
  );
  return { overlap, marginOverflow };
}

function evaluateCandidate(
  intervalValue: TemporalInterval,
  input: TemporalAxisPlanInput,
): CandidateEvaluation | null {
  try {
    const values = temporalIntervalTicks(input.domain[0], input.domain[1], intervalValue, {
      ...temporalOptions(input),
      maxTicks: MAX_TEMPORAL_MAJOR_TICKS,
    });
    if (values.length === 0) return null;
    const ticks = buildTicks(values, intervalValue, input);
    const measured = evaluateTicks(ticks, input);
    return {
      interval: intervalValue,
      ticks,
      ...measured,
      count: ticks.length,
      approxMs: intervalApproxMs(intervalValue),
    };
  } catch {
    return null;
  }
}

function candidateScore(
  candidate: CandidateEvaluation,
): readonly [number, number, number, number, string] {
  const countPenalty =
    candidate.count >= 3 && candidate.count <= 7
      ? Math.abs(candidate.count - 5)
      : 10 + Math.min(Math.abs(candidate.count - 3), Math.abs(candidate.count - 7));
  return [
    candidate.overlap ? 1 : 0,
    candidate.marginOverflow ? 1 : 0,
    countPenalty,
    -candidate.approxMs,
    candidate.interval.key,
  ];
}

function compareScore(left: CandidateEvaluation, right: CandidateEvaluation): number {
  const a = candidateScore(left);
  const b = candidateScore(right);
  for (let index = 0; index < a.length; index++) {
    const av = a[index]!;
    const bv = b[index]!;
    if (av === bv) continue;
    return av < bv ? -1 : 1;
  }
  return 0;
}

function automaticCandidate(input: TemporalAxisPlanInput): CandidateEvaluation {
  const intervalPool =
    input.kind === "date"
      ? AUTOMATIC_INTERVALS.filter((candidate) =>
          ["day", "week", "month", "quarter", "year"].includes(candidate.unit),
        )
      : AUTOMATIC_INTERVALS;
  const span = Math.max(1, input.domain[1] - input.domain[0]);
  const previousApprox =
    input.previousInterval === undefined || input.previousInterval === null
      ? null
      : intervalApproxMs(parseTemporalInterval(input.previousInterval));
  const lowerApprox = previousApprox ?? span / 12;
  const upperApprox = Math.max(lowerApprox, span * 1.1);
  const evaluatePool = (pool: readonly TemporalInterval[]) =>
    pool
      .map((candidate) => evaluateCandidate(candidate, input))
      .filter((candidate): candidate is CandidateEvaluation => candidate !== null)
      .toSorted(
        (left, right) =>
          left.approxMs - right.approxMs ||
          (left.interval.key < right.interval.key
            ? -1
            : left.interval.key > right.interval.key
              ? 1
              : 0),
      );
  const primary = evaluatePool(
    intervalPool.filter((candidate) => {
      const approx = intervalApproxMs(candidate);
      return approx >= lowerApprox && approx <= upperApprox;
    }),
  );
  const coarser = () =>
    evaluatePool(intervalPool.filter((candidate) => intervalApproxMs(candidate) > upperApprox));
  const candidates = primary.length > 0 ? primary : coarser();
  if (candidates.length === 0) {
    const fallback = interval("year", 1);
    return {
      interval: fallback,
      ticks: [],
      overlap: false,
      marginOverflow: false,
      count: 0,
      approxMs: YEAR,
    };
  }

  if (input.previousInterval !== undefined && input.previousInterval !== null) {
    const previous = parseTemporalInterval(input.previousInterval);
    const retained = candidates.find((candidate) => candidate.interval.key === previous.key);
    if (retained !== undefined && !retained.overlap) return retained;
    const fallbackLadder = [...candidates, ...coarser()];
    return fallbackLadder.find((candidate) => !candidate.overlap) ?? fallbackLadder.at(-1)!;
  }
  const fitting = candidates.filter((candidate) => !candidate.overlap);
  if (fitting.length > 0) return fitting.toSorted(compareScore)[0]!;
  const fallbackLadder = [...candidates, ...coarser()];
  return fallbackLadder.find((candidate) => !candidate.overlap) ?? fallbackLadder.at(-1)!;
}

function exactCandidate(input: TemporalAxisPlanInput): CandidateEvaluation {
  const intervalValue = parseTemporalInterval(input.config.dateBreaks!);
  const values = temporalIntervalTicks(input.domain[0], input.domain[1], intervalValue, {
    ...temporalOptions(input),
    maxTicks: MAX_TEMPORAL_MAJOR_TICKS,
  });
  const ticks = buildTicks(values, intervalValue, input);
  return {
    interval: intervalValue,
    ticks,
    ...evaluateTicks(ticks, input),
    count: ticks.length,
    approxMs: intervalApproxMs(intervalValue),
  };
}

function explicitCandidate(input: TemporalAxisPlanInput): CandidateEvaluation {
  const values = (input.breaks ?? []).filter(
    (value) => Number.isFinite(value) && value >= input.domain[0] && value <= input.domain[1],
  );
  const intervalValue = inferExplicitInterval(values);
  const ticks = buildTicks(values, intervalValue, input);
  return {
    interval: intervalValue,
    ticks,
    ...evaluateTicks(ticks, input),
    count: ticks.length,
    approxMs: intervalApproxMs(intervalValue),
  };
}

function inferExplicitInterval(values: readonly number[]): TemporalInterval {
  const ordered = [...new Set(values)].toSorted((left, right) => left - right);
  if (ordered.length < 2) return interval("year", 1);
  let gap = Number.POSITIVE_INFINITY;
  for (let index = 1; index < ordered.length; index++) {
    gap = Math.min(gap, ordered[index]! - ordered[index - 1]!);
  }
  if (gap >= YEAR) return interval("year", Math.max(1, Math.round(gap / YEAR)));
  if (gap >= MONTH) return interval("month", Math.max(1, Math.round(gap / MONTH)));
  if (gap >= DAY) return interval("day", Math.max(1, Math.round(gap / DAY)));
  if (gap >= HOUR) return interval("hour", Math.max(1, Math.round(gap / HOUR)));
  if (gap >= MINUTE) return interval("minute", Math.max(1, Math.round(gap / MINUTE)));
  if (gap >= SECOND) return interval("second", Math.max(1, Math.round(gap / SECOND)));
  return interval("millisecond", Math.max(1, Math.round(gap)));
}

export function planTemporalAxis(input: TemporalAxisPlanInput): AxisGuidePlan {
  const source =
    input.breaks === undefined
      ? input.config.dateBreaks === undefined
        ? "automatic"
        : "interval"
      : "explicit";
  let selected: CandidateEvaluation;
  switch (source) {
    case "automatic":
      selected = automaticCandidate(input);
      break;
    case "interval":
      try {
        selected = exactCandidate(input);
      } catch (error) {
        if (!(error instanceof TemporalIntervalError)) throw error;
        throw new TemporalGuideIntervalError(input.aesthetic, "dateBreaks", error);
      }
      break;
    case "explicit":
      selected = explicitCandidate(input);
      break;
  }

  const majorValues = new Set(selected.ticks.map((tick) => tick.value as number));
  let minorTicks: AxisGuideTick[] = [];
  if (input.config.dateMinorBreaks !== undefined) {
    const minorInterval = parseTemporalInterval(input.config.dateMinorBreaks);
    try {
      const values = temporalIntervalTicks(input.domain[0], input.domain[1], minorInterval, {
        ...temporalOptions(input),
        maxTicks: MAX_TEMPORAL_MINOR_TICKS,
      });
      minorTicks = values
        .filter((value) => !majorValues.has(value))
        .map((value) => ({ value, label: "", fullLabel: "", kind: "minor" as const }));
    } catch (error) {
      if (!(error instanceof TemporalIntervalError)) throw error;
      throw new TemporalGuideIntervalError(input.aesthetic, "dateMinorBreaks", error);
    }
  }

  const degraded = [
    ...(selected.overlap ? ["temporal-label-overlap"] : []),
    ...(selected.marginOverflow ? ["temporal-label-margin-overflow"] : []),
    ...(source === "explicit" &&
    input.sourceBreaks !== undefined &&
    input.sourceBreaks.length > selected.ticks.length
      ? ["temporal-break-outside-domain"]
      : []),
  ];
  return Object.freeze({
    type: "axis" as const,
    id: `axis:${input.aesthetic}:panel:${String(input.panelIndex)}`,
    aesthetic: input.aesthetic,
    panelIndex: input.panelIndex,
    scaleType: "time" as const,
    transform: "identity" as const,
    temporalKind: input.kind,
    domain: Object.freeze([input.domain[0], input.domain[1]] as const),
    direction: input.reverse ? ("descending" as const) : ("ascending" as const),
    source,
    interval: source === "explicit" ? null : selected.interval.key,
    locale: input.config.locale ?? "en-US",
    timezone: input.kind === "date" ? "UTC" : (input.config.timezone ?? "UTC"),
    ticks: Object.freeze([...selected.ticks, ...minorTicks].map((tick) => Object.freeze(tick))),
    ...(input.sourceBreaks !== undefined && {
      sourceBreaks: Object.freeze([...input.sourceBreaks]),
    }),
    overlap: selected.overlap,
    marginOverflow: selected.marginOverflow,
    degraded: Object.freeze(degraded),
  });
}
