/**
 * Tier-2 temporal position scale data-aware checks (inference, kind, time-request).
 * Decision reuse: validate-tier2-temporal-reuse.test.ts.
 * Schema-only temporal scale acceptance: temporal-scale-schema.test.ts.
 * Production: validate-data-checks-position.ts.
 */
import { describe, expect, it } from "bun:test";

import { validate } from "../src/validate.ts";

describe("tier 2 — temporal position scale data checks", () => {
  describe("monthDay", () => {
    const blooms = {
      data: {
        columns: {
          year: [812, 1409, 2026],
          bloom: ["0812-04-01", "1409-03-27", "2026-03-29"],
        },
      },
      layers: [{ geom: "point", aes: { x: { field: "year" }, y: { field: "bloom" } } }],
    } as const;

    it("accepts full dates, because taking their month-day is the whole job", () => {
      // The field parses as `date`; the scale asks for `monthDay`. Those differ,
      // and the kind-mismatch check must not read that as a contradiction.
      const result = validate(
        { ...blooms, scales: { y: { type: "time", temporalKind: "monthDay" } } },
        {},
      );
      expect(result.ok).toBe(true);
    });

    it("accepts bare month-day values and a year-free domain", () => {
      expect(
        validate(
          {
            data: { columns: { year: [812, 2026], bloom: ["04-01", "03-29"] } },
            layers: [{ geom: "point", aes: { x: { field: "year" }, y: { field: "bloom" } } }],
            scales: {
              y: {
                type: "time",
                temporalKind: "monthDay",
                parse: "md",
                domain: ["03-18", "05-10"],
                breaks: ["04-05", "04-15"],
              },
            },
          },
          {},
        ).ok,
      ).toBe(true);
    });

    it("refuses a label format it cannot fill honestly", () => {
      const withLabels = (dateLabels: string) =>
        validate(
          { ...blooms, scales: { y: { type: "time", temporalKind: "monthDay", dateLabels } } },
          {},
        );
      expect(withLabels("%b %e").ok).toBe(true);
      for (const pattern of ["%Y-%m-%d", "%b %e %Y", "%H:%M", "%a %e %b"]) {
        const result = withLabels(pattern);
        expect(result.ok, pattern).toBe(false);
      }
    });

    it("is a position kind only — colour has no use for it", () => {
      const result = validate(
        {
          ...blooms,
          scales: { color: { type: "time", temporalKind: "monthDay" } },
        },
        {},
      );
      expect(result.ok).toBe(false);
    });
  });

  it("shares value-driven inference and explicit parsing with tier-2 validation", () => {
    const years = {
      data: { columns: { when: ["1835", "1900", "2026"], value: [1, 2, 3] } },
      layers: [
        {
          geom: "line",
          aes: { x: { field: "when" }, y: { field: "value" } },
        },
      ],
      scales: { x: { type: "time" } },
    } as const;
    expect(validate(years, {}).ok).toBe(true);
    expect(
      validate(
        {
          ...years,
          data: { columns: { when: ["2024-01-31", "2024-02-29"], value: [1, 2] } },
          scales: { x: { type: "time", parse: "dmy" } },
        },
        {},
      ).ok,
    ).toBe(false);
    const offsetDates = {
      ...years,
      data: {
        columns: {
          when: ["2024-01-31T00:00:00Z", "2024-02-29T00:00:00Z"],
          value: [1, 2],
        },
      },
    } as const;
    expect(
      validate(
        {
          ...offsetDates,
          scales: {
            x: { type: "time", timezone: "Not/A_Zone", parseFailure: "censor" },
          },
        },
        {},
      ).ok,
    ).toBe(false);
    expect(
      validate(
        {
          ...offsetDates,
          scales: {
            x: {
              type: "time",
              parse: { format: "%Y-%m-Q%q" },
              parseFailure: "censor",
            },
          },
        },
        {},
      ).ok,
    ).toBe(false);
    expect(
      validate(
        {
          data: { values: [{}] },
          layers: [{ geom: "rule", params: { yintercept: "2025-01-01" } }],
          scales: {
            y: {
              type: "time",
              parse: { format: "%Y-%m-Q%q" },
              parseFailure: "censor",
            },
          },
        },
        {},
      ).ok,
    ).toBe(false);
    const mostlyIso = Array.from({ length: 65 }, (_, index) =>
      index === 32 ? "not-a-date" : "2025-01-01",
    );
    expect(
      validate(
        {
          ...years,
          data: { columns: { when: mostlyIso, value: mostlyIso.map((_, index) => index) } },
          scales: { x: { type: "time", parseFailure: "censor" } },
        },
        {},
      ).ok,
    ).toBe(false);

    const dmy = {
      data: { columns: { when: ["31/12/2024", "01/01/2025"], value: [1, 2] } },
      layers: [
        {
          geom: "line",
          aes: { x: { field: "when" }, y: { field: "value" } },
        },
      ],
      scales: { x: { parse: "dmy" } },
    } as const;
    expect(validate(dmy, {}).ok).toBe(true);

    for (const geom of ["smooth", "histogram", "density"] as const) {
      const layer = {
        geom,
        aes: {
          x: { field: "when" },
          ...(geom === "smooth" && { y: { field: "value" } }),
        },
      };
      expect(validate({ ...dmy, layers: [layer] }, {}).ok).toBe(true);
    }

    const bad = validate(
      {
        ...dmy,
        data: { columns: { when: ["31/12/2024", "not-a-date"], value: [1, 2] } },
      },
      {},
    );
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.errors[0]?.code).toBe("scale-type-mismatch");
      expect(bad.errors[0]?.message).toContain("rejected 1 value");
    }
  });

  it("applies temporal validation and kind checks to y bounds", () => {
    const errorbar = {
      data: {
        values: [
          { group: "a", lo: "31/12/2024", hi: "01/01/2025" },
          { group: "b", lo: "02/01/2025", hi: "03/01/2025" },
        ],
      },
      layers: [
        {
          geom: "errorbar",
          aes: { x: { field: "group" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
        },
      ],
      scales: { y: { type: "time", parse: "dmy", temporalKind: "date" } },
    } as const;
    expect(validate(errorbar, {}).ok).toBe(true);

    const invalid = validate(
      {
        ...errorbar,
        data: { values: [{ group: "a", lo: "31/12/2024", hi: "not-a-date" }] },
      },
      {},
    );
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) {
      expect(invalid.errors.some((error) => error.path.endsWith("/ymax"))).toBe(true);
      expect(invalid.errors.some((error) => error.message.includes("rejected 1 value"))).toBe(true);
    }

    expect(
      validate(
        {
          ...errorbar,
          data: { values: [{ group: "a", lo: "31/12/2024", hi: "not-a-date" }] },
          scales: { y: { ...errorbar.scales.y, parseFailure: "censor" } },
        },
        {},
      ).ok,
    ).toBe(true);
    expect(
      validate(
        {
          ...errorbar,
          scales: { y: { ...errorbar.scales.y, temporalKind: "datetime" } },
        },
        {},
      ).ok,
    ).toBe(false);
    expect(
      validate(
        {
          ...errorbar,
          data: { values: [{ group: "a", lo: "31/12/2024", hi: "not-a-date" }] },
          scales: {
            y: {
              ...errorbar.scales.y,
              temporalKind: "datetime",
              parseFailure: "censor",
            },
          },
        },
        {},
      ).ok,
    ).toBe(false);
  });

  it("treats every temporal-only option as a time request and enforces kind", () => {
    const nominal = {
      data: { values: [{ label: "alpha", value: 1 }] },
      layers: [
        {
          geom: "point",
          aes: { x: { field: "label" }, y: { field: "value" } },
        },
      ],
      scales: { x: { timezone: "America/New_York" } },
    } as const;
    expect(validate(nominal, {}).ok).toBe(false);
    for (const x of [
      { dateBreaks: "1 day" },
      { dateMinorBreaks: "12 hours" },
      { dateLabels: "%Y-%m-%d" },
      { locale: "en-GB" },
      { weekStart: "monday" as const },
    ]) {
      expect(validate({ ...nominal, scales: { x } }, {}).ok, JSON.stringify(x)).toBe(false);
    }
    expect(
      validate(
        {
          ...nominal,
          scales: {
            x: {
              type: "linear",
              timezone: "Not/A_Zone",
              parseFailure: "censor",
            },
          },
        },
        {},
      ).ok,
    ).toBe(false);

    const datetimeAsDate = {
      data: { values: [{ when: "2025-01-01T10:30:00", value: 1 }] },
      layers: [
        {
          geom: "point",
          aes: { x: { field: "when" }, y: { field: "value" } },
        },
      ],
      scales: { x: { temporalKind: "date", parse: "ymd_hms" } },
    } as const;
    expect(validate(datetimeAsDate, {}).ok).toBe(false);
  });
});
