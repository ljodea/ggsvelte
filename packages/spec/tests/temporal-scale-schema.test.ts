/**
 * Temporal position scale schema validation (portable parsers, guide options).
 * Data-aware tier-2 scale checks: validate-tier2-temporal-reuse.test.ts (reuse) + validate-tier2-temporal-position.test.ts (scales).
 * Authoring helpers / builder Date canonicalization: temporal-scale-authoring.test.ts.
 */
import { describe, expect, it } from "bun:test";

import { scaleXDate, scaleXDiscrete, validate } from "../src/index.ts";

const compileOnlyTemporalTypeAssertions = (): void => {
  // @ts-expect-error portable temporal parsers never accept callbacks
  scaleXDate({ parse: (value: string) => new Date(value) });
  // @ts-expect-error parser names are a closed autocomplete union
  scaleXDate({ parse: "month-day-ish" });
  scaleXDate({
    dateBreaks: "2 weeks",
    dateMinorBreaks: "1 day",
    dateLabels: "%e %b",
    locale: "en-GB",
    weekStart: "monday",
  });
  // @ts-expect-error weekStart is a closed weekday union
  scaleXDate({ weekStart: "workweek" });
  // @ts-expect-error temporal intervals remain portable strings, not callbacks
  scaleXDate({ dateBreaks: () => [new Date()] });
  // @ts-expect-error discrete helpers reject every temporal guide option
  scaleXDiscrete({
    dateBreaks: "1 day",
    dateMinorBreaks: "12 hours",
    dateLabels: "%Y-%m-%d",
    locale: "en-GB",
    weekStart: "monday",
  });
};
void compileOnlyTemporalTypeAssertions;

describe("temporal scale schema", () => {
  it("accepts every portable parser shape and temporal option", () => {
    for (const parse of [
      "iso",
      "year",
      "ym",
      "my",
      "yq",
      "ymd",
      "ydm",
      "mdy",
      "myd",
      "dmy",
      "dym",
      "ymd_hm",
      "dmy_hms",
      { format: "%d/%m/%Y" },
      { epoch: "seconds" },
      { epoch: "milliseconds" },
    ] as const) {
      expect(
        validate({
          layers: [{ geom: "point" }],
          scales: {
            x: {
              type: "time",
              temporalKind: "datetime",
              parse,
              parseFailure: "censor",
              timezone: "Australia/Melbourne",
              disambiguation: "later",
            },
          },
        }).ok,
      ).toBe(true);
    }
  });

  it("enforces the closed dateLabels token grammar in tier-1 validation", () => {
    const accepts = (dateLabels: string) =>
      validate({
        layers: [{ geom: "point" }],
        scales: { x: { type: "time", dateLabels } },
      }).ok;
    expect(accepts("literal %Y %% %y %m %b %B %d %e %a %A %H %I %M %S %L %p %q %z %Z")).toBe(true);
    expect(accepts("%Q")).toBe(false);
    expect(accepts("trailing %")).toBe(false);
  });

  it("rejects invalid temporal configuration without inline data evidence", () => {
    for (const x of [
      { type: "time" as const, timezone: "Not/A_Zone" },
      { type: "time" as const, parse: { format: "%m-%d" } },
      { type: "time" as const, dateBreaks: "0 days" },
      { type: "time" as const, dateBreaks: "1000001 years" },
      { type: "time" as const, dateMinorBreaks: "1 fortnight" },
      { type: "time" as const, dateLabels: "%Q" },
      { type: "time" as const, locale: "not_a_locale" },
      { type: "time" as const, locale: "zz-ZZ" },
      { type: "linear" as const, dateBreaks: "1 year" },
      { type: "band" as const, dateLabels: "%Y" },
    ]) {
      const result = validate(
        {
          data: { name: "runtime" },
          layers: [{ geom: "rule", params: { xintercept: "2025-01-01" } }],
          scales: { x },
        },
        {},
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors[0]?.path.startsWith("/scales/x")).toBe(true);
    }
  });

  it("rejects callbacks, unknown parsers, unbounded formats, and invalid policy values", () => {
    const invalid = [
      { parse: "guess" },
      { parse: { regex: "(.*)" } },
      { parse: { format: "x".repeat(129) } },
      { parseFailure: "drop" },
      { temporalKind: "instant" },
      { disambiguation: "magic" },
    ];
    for (const x of invalid) {
      expect(validate({ layers: [{ geom: "point" }], scales: { x } }).ok).toBe(false);
    }
  });
});
