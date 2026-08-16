/**
 * Legend scene-builder registry.
 *
 * Discrete-color charts register only the categorical builder. Sequential /
 * binned color registers the ramp and steps builders.
 */
import type { TextMeasurer } from "./layout/measure.js";
import type { SceneLegend } from "./scene.js";
import type {
  DiscreteLegendInput,
  LegendOrder,
  RampLegendInput,
  StepsLegendInput,
} from "./legend-build-types.js";

export type DiscreteLegendBuilder = (
  input: DiscreteLegendInput,
  order: LegendOrder,
  measurer: TextMeasurer,
  maxWidth: number,
  position: "right" | "bottom",
) => SceneLegend;

export interface ContinuousLegendBuilders {
  ramp: (
    input: RampLegendInput,
    measurer: TextMeasurer,
    maxWidth: number,
    position: "right" | "bottom",
  ) => SceneLegend;
  steps: (
    input: StepsLegendInput,
    measurer: TextMeasurer,
    maxWidth: number,
    position: "right" | "bottom",
  ) => SceneLegend;
}

let discrete: DiscreteLegendBuilder | undefined;
let continuous: ContinuousLegendBuilders | undefined;

export function registerDiscreteLegendBuilder(build: DiscreteLegendBuilder): void {
  discrete = build;
}

export function registerContinuousLegendBuilders(builders: ContinuousLegendBuilders): void {
  continuous = builders;
}

export function getDiscreteLegendBuilder(): DiscreteLegendBuilder | undefined {
  return discrete;
}

export function getContinuousLegendBuilders(): ContinuousLegendBuilders | undefined {
  return continuous;
}
