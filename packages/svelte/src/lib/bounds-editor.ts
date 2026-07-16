export type BoundsAxis = "x" | "y";
export type BoundsAction = "select" | "zoom";
export type BoundsScale = "linear" | "log" | "time" | "band";
export type BoundsInputSource = "keyboard" | "pointer" | "touch";

export type BoundsCategoryValue = string | number | boolean | bigint | null | undefined | Date;

interface BoundsCategory {
  readonly value: BoundsCategoryValue;
  readonly label: string;
}

interface BoundsEditorInputBase {
  readonly axis: BoundsAxis;
  readonly action: BoundsAction;
  /** Axis reversal affects presentation only; committed domain bounds stay ascending. */
  readonly reversed?: boolean;
}

interface NumericBoundsEditorInput extends BoundsEditorInputBase {
  readonly scale: "linear" | "log";
  readonly bounds: readonly [number, number];
  readonly step?: number | "any";
}

interface TimeBoundsEditorInput extends BoundsEditorInputBase {
  readonly scale: "time";
  /** UTC epoch milliseconds. */
  readonly bounds: readonly [number, number];
}

interface BandBoundsEditorInput extends BoundsEditorInputBase {
  readonly scale: "band";
  /** Inclusive category endpoints, in domain order. */
  readonly bounds: readonly [BoundsCategoryValue, BoundsCategoryValue];
  readonly categories: readonly BoundsCategory[];
}

export type BoundsEditorInput =
  | NumericBoundsEditorInput
  | TimeBoundsEditorInput
  | BandBoundsEditorInput;

interface PreciseBoundsApplyEventBase {
  readonly source: "precise-bounds";
  /** Physical input that activated Apply. */
  readonly inputSource: BoundsInputSource;
  readonly action: BoundsAction;
  readonly axis: BoundsAxis;
  readonly reversed: boolean;
}

export type PreciseBoundsApplyEvent =
  | (PreciseBoundsApplyEventBase & {
      readonly scale: "linear" | "log" | "time";
      readonly bounds: readonly [number, number];
    })
  | (PreciseBoundsApplyEventBase & {
      readonly scale: "band";
      readonly bounds: readonly [BoundsCategoryValue, BoundsCategoryValue];
    });

export interface BoundsDraft {
  readonly lower: string;
  readonly upper: string;
}

export interface BoundsDraftErrors {
  readonly lower?: string;
  readonly upper?: string;
}

export type BoundsDraftValidation =
  | { readonly ok: true; readonly event: PreciseBoundsApplyEvent }
  | { readonly ok: false; readonly errors: BoundsDraftErrors };

function sameCategory(left: BoundsCategoryValue, right: BoundsCategoryValue): boolean {
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  return Object.is(left, right);
}

function categoryIndex(input: BandBoundsEditorInput, value: BoundsCategoryValue): number {
  return input.categories.findIndex((category) => sameCategory(category.value, value));
}

export function formatBoundsDraft(input: BoundsEditorInput): BoundsDraft {
  if (input.scale === "time") {
    return {
      lower: new Date(input.bounds[0]).toISOString(),
      upper: new Date(input.bounds[1]).toISOString(),
    };
  }
  if (input.scale === "band") {
    return {
      lower: String(Math.max(0, categoryIndex(input, input.bounds[0]))),
      upper: String(Math.max(0, categoryIndex(input, input.bounds[1]))),
    };
  }
  return { lower: String(input.bounds[0]), upper: String(input.bounds[1]) };
}

function baseEvent(
  input: BoundsEditorInput,
  inputSource: BoundsInputSource,
): PreciseBoundsApplyEventBase {
  return {
    source: "precise-bounds",
    inputSource,
    action: input.action,
    axis: input.axis,
    reversed: input.reversed ?? false,
  };
}

function parseNumber(draft: string, label: string): number | string {
  if (draft.trim() === "") return `${label} is required.`;
  const value = Number(draft);
  return Number.isFinite(value) ? value : `${label} must be a finite number.`;
}

// Date-only input is UTC by ISO definition. Date-time input must carry an
// explicit Z/offset so a browser locale can never silently change the domain.
// Fractions beyond milliseconds and colonless offsets (both valid ISO 8601,
// both common in database/API timestamps) are accepted and normalized to the
// ECMAScript date-time form before parsing.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/u;

function parseTime(draft: string, label: string): number | string {
  const trimmed = draft.trim();
  if (!ISO_DATE.test(trimmed) && !ISO_DATE_TIME.test(trimmed)) {
    return `${label} must be an ISO 8601 date or date-time with a timezone.`;
  }
  const normalized = trimmed
    .replace(/\.(\d{3})\d+/u, ".$1")
    .replace(/([+-]\d{2})(\d{2})$/u, "$1:$2");
  const value = Date.parse(normalized);
  if (!Number.isFinite(value)) return `${label} must be a valid ISO 8601 date.`;
  // The calendar date component must round-trip: Date.parse silently
  // normalizes overflow days (2025-02-30 → March 2) for date-times too, so
  // validate the date as written, independent of the time and offset.
  const datePart = trimmed.slice(0, 10);
  if (new Date(Date.parse(datePart)).toISOString().slice(0, 10) !== datePart) {
    return `${label} must be a valid ISO 8601 date.`;
  }
  return value;
}

export function validateBoundsDraft(
  input: BoundsEditorInput,
  lowerDraft: string,
  upperDraft: string,
  inputSource: BoundsInputSource = "keyboard",
): BoundsDraftValidation {
  if (input.scale === "band") {
    const lowerIndex = Number(lowerDraft);
    const upperIndex = Number(upperDraft);
    const errors: { lower?: string; upper?: string } = {};
    if (!Number.isInteger(lowerIndex) || input.categories[lowerIndex] === undefined) {
      errors.lower = "Choose a valid lower category.";
    }
    if (!Number.isInteger(upperIndex) || input.categories[upperIndex] === undefined) {
      errors.upper = "Choose a valid upper category.";
    } else if (errors.lower === undefined && upperIndex < lowerIndex) {
      errors.upper = "Upper category must be at or after the lower category.";
    }
    if (errors.lower !== undefined || errors.upper !== undefined) return { ok: false, errors };
    return {
      ok: true,
      event: {
        ...baseEvent(input, inputSource),
        scale: "band",
        bounds: [input.categories[lowerIndex]!.value, input.categories[upperIndex]!.value],
      },
    };
  }

  const lower =
    input.scale === "time"
      ? parseTime(lowerDraft, "Lower bound")
      : parseNumber(lowerDraft, "Lower bound");
  const upper =
    input.scale === "time"
      ? parseTime(upperDraft, "Upper bound")
      : parseNumber(upperDraft, "Upper bound");
  const errors: { lower?: string; upper?: string } = {};
  if (typeof lower === "string") errors.lower = lower;
  if (typeof upper === "string") errors.upper = upper;
  if (input.scale === "log") {
    if (typeof lower === "number" && lower <= 0) {
      errors.lower = "Lower bound must be greater than zero on a log scale.";
    }
    if (typeof upper === "number" && upper <= 0) {
      errors.upper = "Upper bound must be greater than zero on a log scale.";
    }
  }
  if (typeof lower === "number" && typeof upper === "number" && upper <= lower) {
    errors.upper = "Upper bound must be greater than the lower bound.";
  }
  if (errors.lower !== undefined || errors.upper !== undefined) return { ok: false, errors };

  return {
    ok: true,
    event: {
      ...baseEvent(input, inputSource),
      scale: input.scale,
      bounds: [lower as number, upper as number],
    },
  };
}
