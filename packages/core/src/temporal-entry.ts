/**
 * Temporal entry (`@ggsvelte/core/temporal`).
 *
 * Installs the Temporal polyfill parse path and temporal axis planner, then
 * re-exports guide helpers for apps that started from `@ggsvelte/core/render`
 * and later need time scales.
 */
import "./install-temporal.js";

export { installTemporal } from "./install-temporal.js";
export { installTemporalRuntime, getTemporalRuntime } from "./temporal-runtime.js";

export {
  compileTemporalLabelFormat,
  formatTemporalTickSequence,
  formatTime,
} from "./layout/format.js";
export type { TemporalLabelFormatOptions, TemporalTickLabel } from "./layout/format.js";

export { planTemporalAxis } from "./layout/temporal-guide.js";
export type { AxisGuidePlan, TemporalAxisPlanInput } from "./layout/temporal-guide.js";
