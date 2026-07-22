/**
 * Temporal guides facade — portable intervals/labels and tick generation.
 *
 * Implementation:
 *  - temporal-interval.ts — units, parse, label tokens, locale checks
 *  - temporal-ticks.ts — calendar-aligned interval ticks
 */

export {
  MAX_TEMPORAL_CANDIDATES,
  MAX_TEMPORAL_MAJOR_TICKS,
  MAX_TEMPORAL_MINOR_TICKS,
  MIN_TEMPORAL_LABEL_GAP_PX,
  parseTemporalInterval,
  TEMPORAL_INTERVAL_UNITS,
  TEMPORAL_LABEL_TOKENS,
  TEMPORAL_WEEKDAYS,
  TemporalIntervalError,
  TemporalIntervalSpecSchema,
  TemporalLabelSpecSchema,
  temporalLabelConfigurationError,
  temporalLocaleConfigurationError,
  TemporalWeekStartSchema,
  type TemporalInterval,
  type TemporalIntervalSpec,
  type TemporalIntervalUnit,
  type TemporalWeekStart,
} from "./temporal-interval.js";

export { temporalIntervalTicks } from "./temporal-ticks.js";
