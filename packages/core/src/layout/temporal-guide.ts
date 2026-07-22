/**
 * Temporal axis guide planning and stable re-exports for guide plan types,
 * basic (non-temporal) axis assembly, and temporal interval planning.
 *
 * Guide plan type contracts live in `guide-plan-types.ts`.
 */
import {
  MAX_TEMPORAL_MINOR_TICKS,
  parseTemporalInterval,
  TemporalIntervalError,
  temporalIntervalTicks,
} from "@ggsvelte/spec";

import {
  automaticCandidate,
  exactCandidate,
  explicitCandidate,
  temporalOptions,
} from "./temporal-axis-candidates.js";
import type { AxisGuidePlan, AxisGuideTick } from "./guide-plan-types.js";
import type { TemporalAxisPlanInput, TemporalCandidateEvaluation } from "./temporal-axis-types.js";

export type {
  AxisGuidePlan,
  AxisGuideTick,
  ColorbarGuidePlan,
  ColorbarGuideTick,
  ColorstepsGuidePlan,
  ColorstepsGuideStep,
  DiscreteGuideEntry,
  DiscreteGuidePlan,
  GuidePlan,
} from "./guide-plan-types.js";

export type { TemporalAxisPlanInput } from "./temporal-axis-types.js";
export { planBasicAxis } from "./basic-axis.js";

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

export function planTemporalAxis(input: TemporalAxisPlanInput): AxisGuidePlan {
  const source =
    input.breaks === undefined
      ? input.config.dateBreaks === undefined
        ? "automatic"
        : "interval"
      : "explicit";
  let selected: TemporalCandidateEvaluation;
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
