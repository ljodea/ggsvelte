import { describe, expect, it } from "bun:test";

import {
  aes,
  gg,
  scaleXDate,
  scaleXDatetime,
  scaleXDiscrete,
  scaleYDate,
  scaleYDatetime,
  scaleYDiscrete,
  scale_x_date,
  scale_x_datetime,
  SCALE_CAPABILITIES,
  scale_x_discrete,
  scale_y_date,
  scale_y_datetime,
  scale_y_discrete,
  validate,
} from "../src/index.ts";

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

  it("rejects invalid temporal configuration without inline data evidence", () => {
    for (const x of [
      { type: "time" as const, timezone: "Not/A_Zone" },
      { type: "time" as const, parse: { format: "%m-%d" } },
      { type: "time" as const, dateBreaks: "0 days" },
      { type: "time" as const, dateMinorBreaks: "1 fortnight" },
      { type: "time" as const, dateLabels: "%Q" },
      { type: "time" as const, locale: "not_a_locale" },
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

describe("temporal scale authoring surfaces", () => {
  it("records implemented helpers and reserved inert mappings in the capability ledger", () => {
    const temporal = SCALE_CAPABILITIES.find(
      (capability) => capability.family === "position-temporal",
    );
    expect(temporal?.runtime).toBe("implemented");
    expect(temporal?.helpers).toContain("scaleXDate");
    expect(temporal?.helpers).toContain("scale_x_date");
    expect(temporal?.helpers).toContain("scaleYDatetime");
    expect(
      SCALE_CAPABILITIES.find((capability) => capability.family === "mapped-style-reserved")
        ?.runtime,
    ).toBe("schema-only");
  });

  it("exports binding-identical camel and ggplot2 aliases", () => {
    expect(scale_x_date).toBe(scaleXDate);
    expect(scale_x_datetime).toBe(scaleXDatetime);
    expect(scale_y_date).toBe(scaleYDate);
    expect(scale_y_datetime).toBe(scaleYDatetime);
    expect(scale_x_discrete).toBe(scaleXDiscrete);
    expect(scale_y_discrete).toBe(scaleYDiscrete);
  });

  it("normalizes helper, builder, and canonical scale configuration equally", () => {
    const options = {
      parse: "dmy" as const,
      timezone: "UTC",
      disambiguation: "reject" as const,
      dateBreaks: "2 weeks",
      dateMinorBreaks: "1 week",
      dateLabels: "%e %b",
      locale: "en-GB",
      weekStart: "monday" as const,
    };
    const helper = scaleXDate(options);
    expect(helper).toEqual({
      x: {
        type: "time",
        temporalKind: "date",
        parse: "dmy",
        timezone: "UTC",
        disambiguation: "reject",
        dateBreaks: "2 weeks",
        dateMinorBreaks: "1 week",
        dateLabels: "%e %b",
        locale: "en-GB",
        weekStart: "monday",
      },
    });

    const built = gg(
      [
        { when: "31/12/2024", value: 1 },
        { when: "01/01/2025", value: 2 },
      ],
      aes({ x: "when", y: "value" }),
    )
      .geomLine()
      .scaleXDate(options)
      .spec();
    expect(built.scales).toEqual(helper);

    expect(scaleYDate()).toEqual({ y: { type: "time", temporalKind: "date" } });
    expect(scaleXDatetime()).toEqual({ x: { type: "time", temporalKind: "datetime" } });
    expect(scaleYDatetime()).toEqual({ y: { type: "time", temporalKind: "datetime" } });
    expect(scaleXDiscrete()).toEqual({ x: { type: "band" } });
    expect(scaleYDiscrete()).toEqual({ y: { type: "band" } });
  });

  it("canonicalizes authoring Date cells before PortableSpec validation", () => {
    const when = new Date("2024-01-02T03:04:05.000Z");
    const spec = gg([{ when, value: 1 }], aes({ x: "when", y: "value" }))
      .geomPoint()
      .spec();
    expect(spec.data).toEqual({ values: [{ when: "2024-01-02T03:04:05.000Z", value: 1 }] });
    expect(validate(spec).ok).toBe(true);
    expect(
      validate({
        layers: [{ geom: "point" }],
        data: { values: [{ when, value: 1 }] },
      }).ok,
    ).toBe(false);
  });

  it("canonicalizes Date cells mapped to calendar scales as ISO dates", () => {
    const spec = gg(
      [
        { when: new Date("2024-01-01T00:00:00.000Z"), value: 1 },
        { when: new Date("2024-01-02T00:00:00.000Z"), value: 2 },
      ],
      aes({ x: "when", y: "value" }),
    )
      .geomLine()
      .scaleXDate({ parse: "iso" })
      .spec();

    expect(spec.data).toEqual({
      values: [
        { when: "2024-01-01", value: 1 },
        { when: "2024-01-02", value: 2 },
      ],
    });
  });
});
