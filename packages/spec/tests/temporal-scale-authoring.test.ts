/**
 * Temporal scale authoring surfaces: capability ledger, helper aliases, builder
 * Date canonicalization. Schema validation: temporal-scale-schema.test.ts.
 */
import { describe, expect, it } from "bun:test";

import {
  aes,
  gg,
  normalize,
  scaleXDate,
  scaleXDatetime,
  scaleXDiscrete,
  scaleYDate,
  scaleYDatetime,
  scaleYDiscrete,
  scale_x_date,
  scale_x_datetime,
  scale_x_discrete,
  SCALE_CAPABILITIES,
  scale_y_date,
  scale_y_datetime,
  scale_y_discrete,
  validate,
} from "../src/index.ts";

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
      SCALE_CAPABILITIES.find((capability) => capability.family === "numeric-style")?.runtime,
    ).toBe("implemented");
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
    expect(
      scaleXDiscrete({
        reverse: true,
        dateBreaks: "1 day",
        dateMinorBreaks: "12 hours",
        dateLabels: "%Y-%m-%d",
        locale: "en-GB",
        weekStart: "monday",
      } as never),
    ).toEqual({ x: { type: "band", reverse: true } });
    expect(
      normalize({
        layers: [{ geom: "point" }],
        scales: {
          x: {
            type: "band",
            reverse: true,
            dateBreaks: "1 day",
            dateMinorBreaks: "12 hours",
            dateLabels: "%Y-%m-%d",
            locale: "en-GB",
            weekStart: "monday",
          },
        },
      }).scales,
    ).toEqual({ x: { type: "band", reverse: true } });
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
