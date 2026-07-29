/**
 * TypeBox schemas for temporal intervals and labels (schema graph / validate only).
 * Runtime parse + label checks live in temporal-interval.ts without typebox.
 */
import Type, { type TLiteral } from "typebox";

import {
  TEMPORAL_LABEL_TOKENS,
  TEMPORAL_WEEKDAYS,
  type TemporalWeekStart,
} from "./temporal-interval.js";

const WEEKDAY_SCHEMAS = TEMPORAL_WEEKDAYS.map((weekday) => Type.Literal(weekday)) as unknown as [
  TLiteral<TemporalWeekStart>,
  ...TLiteral<TemporalWeekStart>[],
];

const TEMPORAL_INTERVAL_STEP_PATTERN = "(?:[1-9][0-9]{0,5}|1000000)";

export const TemporalIntervalSpecSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: `^[ ]*${TEMPORAL_INTERVAL_STEP_PATTERN}[ ]+(?:millisecond|second|minute|hour|day|week|month|quarter|year)s?[ ]*$`,
  description:
    'A positive integer calendar interval such as "2 weeks", "3 months", or "10 years". Canonical units are millisecond, second, minute, hour, day, week, month, quarter, and year.',
});

export const TemporalWeekStartSchema = Type.Union(WEEKDAY_SCHEMAS, {
  description: 'Week boundary used by temporal interval breaks. Default "monday".',
});

const TEMPORAL_LABEL_PATTERN = `^(?:[^%]|%(?:${TEMPORAL_LABEL_TOKENS.join("|")}))+$`;

export const TemporalLabelSpecSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: TEMPORAL_LABEL_PATTERN,
  description:
    "Strict temporal label format. Supported tokens: %Y %y %m %b %B %d %e %a %A %H %I %M %S %L %p %q %z %Z %%.",
});
