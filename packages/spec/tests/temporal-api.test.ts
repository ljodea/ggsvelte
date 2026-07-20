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
  // @ts-expect-error dateBreaks belongs to PR 2 after interval support exists
  scaleXDate({ dateBreaks: "2 weeks" });
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
    const options = { parse: "dmy" as const, timezone: "UTC", disambiguation: "reject" as const };
    const helper = scaleXDate(options);
    expect(helper).toEqual({
      x: {
        type: "time",
        temporalKind: "date",
        parse: "dmy",
        timezone: "UTC",
        disambiguation: "reject",
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
});
