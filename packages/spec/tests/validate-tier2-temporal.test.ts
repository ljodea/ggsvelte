/**
 * Tier-2 temporal data-aware characterization: decision reuse, position scale
 * inference/kind checks, and multi-consumer paths.
 * Schema-only temporal scale acceptance: temporal-scale-schema.test.ts.
 * Other data-aware checks: validate-tier2-data.test.ts.
 * Production: validate-data-checks-temporal.ts + validate-data-checks-position.ts.
 */
import { describe, expect, it } from "bun:test";

import { aes, gg } from "../src/builder.ts";
import type { DataProfile } from "../src/validate-data.ts";
import { validate } from "../src/validate.ts";

function errorsOf(input: unknown, options?: Parameters<typeof validate>[1]) {
  const result = validate(input, options ?? {});
  if (result.ok) throw new Error("expected validation failure");
  return result.errors;
}

describe("tier 2 — temporal decision reuse (characterization)", () => {
  it("accepts multi-layer charts that share one temporal field under auto time scales", () => {
    const when = ["2024-01-01", "2024-01-02", "2024-01-03"];
    const value = [1, 2, 3];
    const result = validate(
      {
        data: { columns: { when, value } },
        aes: { x: { field: "when" }, y: { field: "value" } },
        scales: { x: { type: "time" } },
        layers: [{ geom: "point" }, { geom: "line" }, { geom: "smooth" }],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("reports the same ambiguous auto-inference detail once per consumer path", () => {
    const errors = errorsOf({
      data: {
        columns: {
          when: ["01/02/2023", "03/04/2023"],
          value: [1, 2],
        },
      },
      aes: { x: { field: "when" }, y: { field: "value" } },
      scales: { x: { type: "time" } },
      layers: [{ geom: "point" }, { geom: "line" }],
    });
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch", "scale-type-mismatch"]);
    expect(errors.every((e) => e.message.includes("ambiguous between: mdy, dmy"))).toBe(true);
    expect(errors.map((e) => e.path)).toEqual(["/layers/0/aes/x", "/layers/1/aes/x"]);
  });

  it("preserves explicit-parse rejection details across ymin and ymax on the same scale", () => {
    const errors = errorsOf({
      data: {
        columns: {
          group: ["a", "b"],
          lo: ["31/12/2024", "01/01/2025"],
          hi: ["not-a-date", "02/01/2025"],
        },
      },
      layers: [
        {
          geom: "errorbar",
          aes: { x: { field: "group" }, ymin: { field: "lo" }, ymax: { field: "hi" } },
        },
      ],
      scales: { y: { type: "time", parse: "dmy" } },
    });
    const ymax = errors.filter((e) => e.path.endsWith("/ymax"));
    expect(ymax).toHaveLength(1);
    expect(ymax[0]?.message).toContain("rejected 1 value");
    expect(ymax[0]?.message).toContain("not-a-date");
  });

  it("accepts builder Date cells under auto time scales after multi-layer canonicalize", () => {
    // PortableSpec forbids raw Date cells; the builder ISO-coerces them, then
    // multi-layer temporal consumers must share one decision for the field.
    const when0 = new Date("2024-01-01T00:00:00.000Z");
    const when1 = new Date("2024-01-02T00:00:00.000Z");
    const spec = gg(
      [
        { when: when0, value: 1 },
        { when: when1, value: 2 },
      ],
      aes({ x: "when", y: "value" }),
    )
      .geomPoint()
      .geomLine()
      .scaleXDatetime()
      .spec();
    expect(validate(spec, {}).ok).toBe(true);
  });

  it("validates the same field for both position and sequential color consumers", () => {
    const when = ["2024-01-01", "2024-01-02", "2024-01-03"];
    const result = validate(
      {
        data: { columns: { when, value: [1, 2, 3] } },
        aes: { x: { field: "when" }, y: { field: "value" }, color: { field: "when" } },
        scales: {
          x: { type: "time" },
          color: { type: "sequential", parse: "iso", temporalKind: "date" },
        },
        layers: [{ geom: "point" }],
      },
      {},
    );
    expect(result.ok).toBe(true);
  });

  it("profile-backed temporal fields with timezone options do not invent inline evidence", () => {
    // Profile fields have temporal: null / values: null. A non-default timezone
    // must still accept profile-typed temporal fields (no accidental reuse of
    // missing evidence decisions that would flip acceptance).
    const profile: DataProfile = {
      fields: [
        { name: "when", type: "temporal" },
        { name: "value", type: "quantitative" },
      ],
    };
    const result = validate(
      {
        aes: { x: { field: "when" }, y: { field: "value" } },
        scales: { x: { type: "time", timezone: "America/New_York" } },
        layers: [{ geom: "point" }, { geom: "line" }],
      },
      { profile },
    );
    expect(result.ok).toBe(true);
  });

  it("still rejects profile nominal fields under time scales with disambiguation set", () => {
    const profile: DataProfile = {
      fields: [
        { name: "city", type: "nominal" },
        { name: "value", type: "quantitative" },
      ],
    };
    const errors = errorsOf(
      {
        aes: { x: { field: "city" }, y: { field: "value" } },
        scales: { x: { type: "time", disambiguation: "earlier" } },
        layers: [{ geom: "point" }, { geom: "line" }],
      },
      { profile },
    );
    expect(errors.map((e) => e.code)).toEqual(["scale-type-mismatch", "scale-type-mismatch"]);
    expect(errors.every((e) => e.message.includes('field "city" is nominal'))).toBe(true);
  });
});

describe("tier 2 — temporal position scale data checks", () => {
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
