/**
 * Portable temporal interval grammar, label token contract, and locale checks.
 * Tick generation lives in temporal-ticks.ts; facade re-exports in temporal-guides.ts.
 */

import Type, { type Static, type TLiteral } from "typebox";

export const TEMPORAL_INTERVAL_UNITS = [
  "millisecond",
  "second",
  "minute",
  "hour",
  "day",
  "week",
  "month",
  "quarter",
  "year",
] as const;
export type TemporalIntervalUnit = (typeof TEMPORAL_INTERVAL_UNITS)[number];

export const TEMPORAL_WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type TemporalWeekStart = (typeof TEMPORAL_WEEKDAYS)[number];

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
export type TemporalIntervalSpec = Static<typeof TemporalIntervalSpecSchema>;

export const TemporalWeekStartSchema = Type.Union(WEEKDAY_SCHEMAS, {
  description: 'Week boundary used by temporal interval breaks. Default "monday".',
});

export interface TemporalInterval {
  unit: TemporalIntervalUnit;
  step: number;
  key: string;
}

export const MAX_TEMPORAL_CANDIDATES = 128;
export const MAX_TEMPORAL_MAJOR_TICKS = 64;
export const MAX_TEMPORAL_MINOR_TICKS = 256;
export const MIN_TEMPORAL_LABEL_GAP_PX = 6;

export class TemporalIntervalError extends Error {
  readonly value: string;

  constructor(value: string, reason: string) {
    super(`Invalid temporal interval ${JSON.stringify(value)}: ${reason}.`);
    this.name = "TemporalIntervalError";
    this.value = value;
  }
}

const INTERVAL_RE = new RegExp(
  `^(${TEMPORAL_INTERVAL_STEP_PATTERN}) +(millisecond|second|minute|hour|day|week|month|quarter|year)(s?)$`,
);

export function parseTemporalInterval(value: string): TemporalInterval;
export function parseTemporalInterval(value: unknown): TemporalInterval {
  if (typeof value !== "string" || value.length > 128) {
    throw new TemporalIntervalError(String(value), "expected a string of at most 128 characters");
  }
  const match = INTERVAL_RE.exec(value.replaceAll(/^ +| +$/g, ""));
  if (match === null) {
    throw new TemporalIntervalError(
      value,
      'expected "<positive integer> <unit>" using a canonical calendar unit',
    );
  }
  const step = Number(match[1]);
  if (!Number.isSafeInteger(step) || step < 1 || step > 1_000_000) {
    throw new TemporalIntervalError(value, "step must be an integer from 1 through 1,000,000");
  }
  const unit = match[2] as TemporalIntervalUnit;
  return { unit, step, key: `${step} ${unit}${step === 1 ? "" : "s"}` };
}

export const TEMPORAL_LABEL_TOKENS = [
  "Y",
  "y",
  "m",
  "b",
  "B",
  "d",
  "e",
  "a",
  "A",
  "H",
  "I",
  "M",
  "S",
  "L",
  "p",
  "q",
  "z",
  "Z",
  "%",
] as const;
const LABEL_TOKEN_SET = new Set<string>(TEMPORAL_LABEL_TOKENS);
const TEMPORAL_LABEL_PATTERN = `^(?:[^%]|%(?:${TEMPORAL_LABEL_TOKENS.join("|")}))+$`;

export const TemporalLabelSpecSchema = Type.String({
  minLength: 1,
  maxLength: 128,
  pattern: TEMPORAL_LABEL_PATTERN,
  description:
    "Strict temporal label format. Supported tokens: %Y %y %m %b %B %d %e %a %A %H %I %M %S %L %p %q %z %Z %%.",
});

export function temporalLabelConfigurationError(pattern: string): string | null {
  if (pattern.length === 0 || pattern.length > 128) {
    return "dateLabels must contain 1 through 128 characters";
  }
  for (let index = 0; index < pattern.length; index++) {
    if (pattern[index] !== "%") continue;
    const token = pattern[++index];
    if (token === undefined || !LABEL_TOKEN_SET.has(token)) {
      return `unsupported dateLabels token %${token ?? ""}`;
    }
  }
  return null;
}

export function temporalLocaleConfigurationError(locale: string): string | null {
  if (locale.length === 0 || locale.length > 128) {
    return "locale must contain 1 through 128 characters";
  }
  try {
    const canonical = Intl.getCanonicalLocales(locale);
    if (canonical.length !== 1) return `invalid or unsupported locale ${JSON.stringify(locale)}`;
    const supported = Intl.DateTimeFormat.supportedLocalesOf(canonical, {
      localeMatcher: "lookup",
    });
    if (supported.length !== 1) {
      return `invalid or unsupported locale ${JSON.stringify(locale)}`;
    }
    new Intl.DateTimeFormat(canonical[0], { timeZone: "UTC", year: "numeric" }).format(0);
    return null;
  } catch {
    return `invalid or unsupported locale ${JSON.stringify(locale)}`;
  }
}
