/** Pack a sequential scale into renderer input and a serializable colorbar plan. */
import { linearTicks, logTicks } from "../layout/ticks.js";
import { timeTicks } from "../layout/time.js";
import type { SequentialColorScale } from "../scales/color.js";
import { scaleTransform } from "../scales/transform.js";

import type { ColorLegendFormatter } from "./scale-color-sequential-format.js";
import type { ColorResolution } from "./scale-color-types.js";

const GUIDE_STOP_COUNT = 10;

function colorbarTicks(scale: SequentialColorScale): number[] {
  if (scale.guideBreaks !== undefined) return [...scale.guideBreaks];
  if (scale.temporal === true) {
    return timeTicks(scale.domain[0], scale.domain[1], 5).values;
  }
  if (scale.transform === "identity") return linearTicks(scale.domain[0], scale.domain[1], 5);
  if (scale.transform === "log10") return logTicks(scale.domain[0], scale.domain[1], 5);
  const transform = scaleTransform(scale.transform);
  return linearTicks(scale.transformedDomain[0], scale.transformedDomain[1], 5).map((value) =>
    transform.inverse(value),
  );
}

export function sequentialColorResolution(
  name: "color" | "fill",
  legendTitle: string,
  scale: SequentialColorScale,
  format: ColorLegendFormatter,
): ColorResolution {
  const tickValues = colorbarTicks(scale);
  const stops = Array.from({ length: GUIDE_STOP_COUNT }, (_, index) => {
    const offset = index / (GUIDE_STOP_COUNT - 1);
    return Object.freeze([offset, scale.at(offset)] as const);
  });
  const ticks = tickValues.map((value) =>
    Object.freeze({ value, label: format.label(value), fullLabel: format.fullLabel(value) }),
  );
  return {
    resolved: { kind: "sequential", scale },
    legendInput: {
      kind: "ramp",
      scale: name,
      title: legendTitle,
      domain: scale.domain,
      at: (t: number) => scale.at(t),
      format: (value: number) => format.label(value),
      ticks: tickValues,
    },
    guidePlan: Object.freeze({
      type: "colorbar" as const,
      id: `guide:${name}`,
      aesthetic: name,
      title: legendTitle,
      domain: Object.freeze([...scale.domain] as [number, number]),
      transformedDomain: Object.freeze([...scale.transformedDomain] as [number, number]),
      transform: scale.transform,
      temporalKind: scale.temporalKind ?? null,
      direction: scale.reverse ? ("descending" as const) : ("ascending" as const),
      ticks: Object.freeze(ticks),
      stops: Object.freeze(stops),
      naValue: scale.naValue,
      unknownValue: scale.unknownValue,
    }),
    state: null,
  };
}
