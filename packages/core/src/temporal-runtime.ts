/**
 * Optional temporal runtime hooks.
 *
 * The lean `@ggsvelte/core/render` entry leaves these unset so chart bundles
 * that only need numeric axes never load `@js-temporal/polyfill` or the full
 * temporal guide planner. The full package entry (and `@ggsvelte/core/temporal`)
 * call {@link installTemporalRuntime}.
 */
import type { TemporalParserSpec } from "@ggsvelte/spec";

import type { AxisGuidePlan } from "./layout/temporal-guide.js";
import type { TemporalAxisPlanInput } from "./layout/temporal-axis-types.js";
import type { CellValue, ParsedColumnOptions, ParsedColumnView } from "./table-types.js";

export type TemporalColumnParser = (
  raw: readonly CellValue[],
  parser: TemporalParserSpec | "auto",
  options: ParsedColumnOptions,
) => {
  readonly decision: ParsedColumnView["decision"];
  readonly semantic: Float64Array;
  readonly valid: Uint8Array;
  readonly kind: ParsedColumnView["temporalKind"];
  readonly precision: ParsedColumnView["temporalPrecision"];
};

export type TemporalAxisPlanner = (input: TemporalAxisPlanInput) => AxisGuidePlan;

export type TemporalParserKeyFn = (parser: TemporalParserSpec) => string;

export type TemporalLabelCompiler = (
  pattern: string,
  options: { kind: string; locale?: string; timezone?: string },
) => (value: number) => string;

export interface TemporalRuntime {
  readonly parseColumn: TemporalColumnParser;
  readonly planAxis: TemporalAxisPlanner;
  readonly parserKey: TemporalParserKeyFn;
  readonly compileLabelFormat: TemporalLabelCompiler;
}

let runtime: TemporalRuntime | null = null;

/** Install full temporal semantics (polyfill + guide planner). Idempotent. */
export function installTemporalRuntime(next: TemporalRuntime): void {
  runtime = next;
}

export function getTemporalRuntime(): TemporalRuntime | null {
  return runtime;
}

export function requireTemporalRuntime(feature: string): TemporalRuntime {
  if (runtime === null) {
    throw new Error(
      `${feature} requires the temporal runtime. Import @ggsvelte/core (full) or @ggsvelte/core/temporal before rendering time scales.`,
    );
  }
  return runtime;
}
